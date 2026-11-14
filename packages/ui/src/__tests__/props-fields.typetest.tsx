/* Type test, never run: the field controls take ordinary HTML attributes and a ref to their primary element. */
import * as React from 'react'
import { Select } from '../components/select'
import { Combobox } from '../components/combobox'
import { NumberInput } from '../components/number-input'
import { InputOTP } from '../components/input-otp'
import { Slider } from '../components/slider'
import { SegmentedControl } from '../components/segmented-control'
import { Calendar, DatePicker, DatePickerPanel, DateRangePicker, DateRangePickerPanel } from '../components/date-picker'

const options = [{ value: 'a', label: 'A' }]

export const select = <Select id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} options={options} ref={React.createRef<HTMLButtonElement>()} />
export const combobox = <Combobox id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} options={options} ref={React.createRef<HTMLButtonElement>()} />
export const numberInput = <NumberInput id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} ref={React.createRef<HTMLInputElement>()} />
export const inputOtp = <InputOTP id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} ref={React.createRef<HTMLInputElement>()} />
export const slider = <Slider id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} ref={React.createRef<HTMLSpanElement>()} />
export const segmented = <SegmentedControl id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} items={[{ value: 'a', label: 'A' }]} ref={React.createRef<HTMLDivElement>()} />
export const datePicker = <DatePicker id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} ref={React.createRef<HTMLButtonElement>()} />
export const dateRangePicker = <DateRangePicker id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} ref={React.createRef<HTMLButtonElement>()} />
export const calendar = <Calendar id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} ref={React.createRef<HTMLDivElement>()} />
export const datePickerPanel = <DatePickerPanel id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} ref={React.createRef<HTMLDivElement>()} />
export const dateRangePickerPanel = <DateRangePickerPanel id="x" data-testid="x" aria-describedby="x" onKeyDown={() => {}} ref={React.createRef<HTMLDivElement>()} />

// The ref is typed by its element: an <input> ref doesn't fit the Select's trigger button.
// @ts-expect-error
export const wrongRef = <Select options={options} ref={React.createRef<HTMLInputElement>()} />
