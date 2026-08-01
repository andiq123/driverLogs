"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { createExpense, createVehicle, deleteExpense, deleteVehicle, endTrip, errorMessage, startTrip, updateExpense, updateExpenseAnalytics, updateUserSettings, updateVehicle, uploadExpenseAttachment } from "./api";
import type { Expense, ToastKind, UserSettings, Vehicle, View } from "./types";

type UseAppMutationsDeps = {
  token: string;
  isDemo: boolean;
  loadData: (showLoading?: boolean) => Promise<void>;
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  setStatus: (status: string) => void;
  selectVehicle: (id: string) => void;
  clearSelectedVehicle: () => void;
  changeView: (view: View) => void;
  showToast: (type: ToastKind, title: string, message?: string, key?: string) => void;
  closeLoginNotice: () => void;
  expenses: Expense[];
};

export function useAppMutations({
  token,
  isDemo,
  loadData,
  settings,
  setSettings,
  setExpenses,
  setStatus,
  selectVehicle,
  clearSelectedVehicle,
  changeView,
  showToast,
  closeLoginNotice,
  expenses,
}: UseAppMutationsDeps) {
  const [action, setAction] = useState<"vehicle" | "expense" | "settings" | "delete" | "profile" | "trip" | "">("");
  const [openExpenseFilesID, setOpenExpenseFilesID] = useState("");

  const blockedInDemo = useCallback(() => {
    if (!isDemo) return false;
    showToast("info", "Demo mode", "Sample data is read-only. Sign in to save your own.");
    return true;
  }, [isDemo, showToast]);

  const uploadExpenseFiles = useCallback(async (expenseID: string, files: File[]) => {
    for (const file of files) {
      try {
        await uploadExpenseAttachment(token, expenseID, file);
      } catch (error) {
        return error;
      }
    }
    return undefined;
  }, [token]);

  const saveVehicle = useCallback(async (vehicle: Partial<Vehicle>) => {
    if (blockedInDemo()) return;
    setAction("vehicle");
    setStatus("Saving vehicle...");
    try {
      const saved = await createVehicle(token, vehicle);
      await loadData(false);
      selectVehicle(saved.id);
      changeView("Dashboard");
      showToast("success", "Vehicle saved", "Your garage was updated.");
    } catch {
      setStatus("Vehicle could not be saved. Each user can have up to 4 vehicles.");
      showToast("error", "Vehicle was not saved", "Each user can have up to 4 vehicles.");
    } finally {
      setAction("");
    }
  }, [blockedInDemo, changeView, loadData, selectVehicle, setStatus, showToast, token]);

  const editVehicle = useCallback(async (id: string, vehicle: Partial<Vehicle>) => {
    if (blockedInDemo()) return;
    setAction("vehicle");
    setStatus("Saving vehicle...");
    try {
      const saved = await updateVehicle(token, id, vehicle);
      await loadData(false);
      selectVehicle(saved.id);
      showToast("success", "Vehicle updated", "Your car details were saved.");
    } catch (error) {
      setStatus("Vehicle could not be updated.");
      showToast("error", "Vehicle was not updated", errorMessage(error, "Check required fields and backend availability."));
    } finally {
      setAction("");
    }
  }, [blockedInDemo, loadData, selectVehicle, setStatus, showToast, token]);

  const saveExpense = useCallback(async (expense: Partial<Expense>, files: File[] = []) => {
    if (blockedInDemo()) return;
    setAction("expense");
    setStatus("Saving expense...");
    try {
      const saved = await createExpense(token, expense);
      const uploadError = await uploadExpenseFiles(saved.id, files);
      await loadData(false);
      setOpenExpenseFilesID(saved.id);
      changeView("Timeline");
      showToast("success", "Expense saved", files.length && !uploadError ? `${files.length} file${files.length === 1 ? "" : "s"} attached.` : "You can attach files from the timeline.");
      if (uploadError) showToast("error", "File upload failed", errorMessage(uploadError, "The expense was saved, but one or more files were not attached."));
    } catch (error) {
      setStatus("Expense could not be saved. Check the required fields.");
      showToast("error", "Expense was not saved", errorMessage(error, "Check required fields and backend availability."));
    } finally {
      setAction("");
    }
  }, [blockedInDemo, changeView, loadData, setStatus, showToast, token, uploadExpenseFiles]);

  const editExpense = useCallback(async (id: string, expense: Partial<Expense>, files: File[] = []) => {
    if (blockedInDemo()) return;
    setAction("expense");
    setStatus("Saving expense...");
    try {
      await updateExpense(token, id, expense);
      const uploadError = await uploadExpenseFiles(id, files);
      await loadData(false);
      setOpenExpenseFilesID(id);
      showToast("success", "Expense updated", files.length && !uploadError ? `${files.length} file${files.length === 1 ? "" : "s"} attached.` : "The conversion was refreshed for that date.");
      if (uploadError) showToast("error", "File upload failed", errorMessage(uploadError, "The expense was saved, but one or more files were not attached."));
    } catch (error) {
      setStatus("Expense could not be updated.");
      showToast("error", "Expense was not updated", errorMessage(error, "Check required fields and backend availability."));
    } finally {
      setAction("");
    }
  }, [blockedInDemo, loadData, setStatus, showToast, token, uploadExpenseFiles]);

  const toggleExpenseAnalytics = useCallback(async (expense: Expense, excluded: boolean) => {
    if (blockedInDemo()) return;
    const previousExpenses = expenses;
    setExpenses((current) => current.map((item) => item.id === expense.id ? { ...item, exclude_from_analytics: excluded } : item));
    setAction("expense");
    try {
      await updateExpenseAnalytics(token, expense.id, excluded);
      await loadData(false);
      showToast("success", excluded ? "Hidden from analytics" : "Included in analytics", "Totals were recalculated.");
    } catch (error) {
      setExpenses(previousExpenses);
      showToast("error", "Analytics setting was not saved", errorMessage(error, "Check backend availability."));
    } finally {
      setAction("");
    }
  }, [blockedInDemo, expenses, loadData, setExpenses, showToast, token]);

  const removeExpense = useCallback(async (id: string) => {
    if (blockedInDemo()) return;
    setAction("delete");
    setStatus("Removing expense...");
    try {
      await deleteExpense(token, id);
      await loadData(false);
      showToast("success", "Expense removed");
    } catch (error) {
      setStatus("Expense could not be removed.");
      showToast("error", "Expense was not removed", errorMessage(error, "Check backend availability."));
    } finally {
      setAction("");
    }
  }, [blockedInDemo, loadData, setStatus, showToast, token]);

  const saveSettings = useCallback(async (nextSettings: UserSettings) => {
    if (blockedInDemo()) return;
    setAction("settings");
    setStatus("Saving settings...");
    try {
      const saved = await updateUserSettings(token, nextSettings);
      setSettings(saved);
      setStatus("Settings saved.");
      showToast("success", "Settings saved");
    } catch {
      setStatus("Settings could not be saved.");
      showToast("error", "Settings were not saved");
    } finally {
      setAction("");
    }
  }, [blockedInDemo, setSettings, setStatus, showToast, token]);

  const saveProfileName = useCallback(async (name: string) => {
    setAction("profile");
    await saveSettings({ ...settings, name });
    closeLoginNotice();
    setAction("");
  }, [closeLoginNotice, saveSettings, settings]);

  const removeVehicle = useCallback(async (id: string) => {
    if (blockedInDemo()) return;
    setAction("delete");
    setStatus("Removing vehicle...");
    try {
      await deleteVehicle(token, id);
      clearSelectedVehicle();
      await loadData(false);
      showToast("success", "Vehicle removed");
    } catch {
      setStatus("Vehicle could not be removed.");
      showToast("error", "Vehicle was not removed");
    } finally {
      setAction("");
    }
  }, [blockedInDemo, clearSelectedVehicle, loadData, setStatus, showToast, token]);

  const startVehicleTrip = useCallback(async (vehicleID: string, name?: string, startOdometer?: number) => {
    if (blockedInDemo()) return;
    setAction("trip");
    try {
      await startTrip(token, { vehicle_id: vehicleID, name, start_odometer: startOdometer });
      await loadData(false);
      showToast("success", "Trip started", "New fuel fills will be grouped automatically.");
    } catch (error) {
      showToast("error", "Trip was not started", errorMessage(error, "Please try again."));
    } finally {
      setAction("");
    }
  }, [blockedInDemo, loadData, showToast, token]);

  const endVehicleTrip = useCallback(async (tripID: string, endOdometer?: number) => {
    if (blockedInDemo()) return;
    setAction("trip");
    try {
      await endTrip(token, tripID, endOdometer);
      await loadData(false);
      showToast("success", "Trip finished", "Your fuel and distance summary is ready.");
    } catch (error) {
      showToast("error", "Trip was not finished", errorMessage(error, "Check the odometer and try again."));
    } finally {
      setAction("");
    }
  }, [blockedInDemo, loadData, showToast, token]);

  return {
    action,
    editExpense,
    editVehicle,
    endVehicleTrip,
    openExpenseFilesID,
    removeExpense,
    removeVehicle,
    saveExpense,
    saveProfileName,
    saveSettings,
    saveVehicle,
    startVehicleTrip,
    setOpenExpenseFilesID,
    toggleExpenseAnalytics,
  };
}
