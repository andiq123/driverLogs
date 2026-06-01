package store

import "errors"

var ErrNotFound = errors.New("not found")
var ErrVehicleLimit = errors.New("vehicle limit reached")
var ErrUnsupportedSetting = errors.New("unsupported setting")
