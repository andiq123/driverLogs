package store

import "errors"

var ErrNotFound = errors.New("not found")
var ErrVehicleLimit = errors.New("vehicle limit reached")
var ErrUnsupportedSetting = errors.New("unsupported setting")
var ErrActiveTrip = errors.New("vehicle already has an active trip")
var ErrInvalidTripOdometer = errors.New("trip end odometer is below its start")
