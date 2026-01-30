package db

import "errors"

var ErrNotFound = errors.New("not found")
var ErrDuplicate = errors.New("duplicate")
var ErrInvalidInput = errors.New("invalid input")
