import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";

export type TimeFormat = "24hr" | "am/pm";

export type TimeValue = {
  hours: number;
  minutes: number;
  seconds: number;
  period?: "AM" | "PM"; // Only used in am/pm format
};

export type InputPosition = "hours" | "minutes" | "seconds";

type TimePickerContextType = {
  timePickerState: {
    isVisible: boolean;
    selectedTime: TimeValue;
    format: TimeFormat;
    currentInputPosition: InputPosition;
    inputBuffer: string; // Temporary buffer for typing
    shouldInclude: {
      hours: boolean;
      minutes: boolean;
      seconds: boolean;
    };
  };
  setTimePickerState: Dispatch<
    SetStateAction<TimePickerContextType["timePickerState"]>
  >;
};

const TimePickerContext = createContext<TimePickerContextType | null>(null);
let CALLBACKS = {
  onTimeChange: (_: TimeValue) => {},
  onVisibilityChange: (_: boolean) => {},
};

export const useTimePicker = (
  onTimeChange = CALLBACKS["onTimeChange"],
  onVisibilityChange = CALLBACKS["onVisibilityChange"],
) => {
  CALLBACKS.onTimeChange = onTimeChange;
  CALLBACKS.onVisibilityChange = onVisibilityChange;

  const timePickerContextValue = useContext(TimePickerContext);
  if (!timePickerContextValue) {
    throw new Error("useTimePicker must be used within a TimePickerProvider");
  }

  const { timePickerState, setTimePickerState } = timePickerContextValue;

  const updateHours = (hours: number) => {
    let validHours = hours;

    if (timePickerState.format === "24hr") {
      validHours = Math.max(0, Math.min(23, hours));
    } else {
      validHours = Math.max(1, Math.min(12, hours));
    }

    const newTime = {
      ...timePickerState,
      selectedTime: {
        ...timePickerState.selectedTime,
        hours: validHours,
      },
    };

    setTimePickerState(newTime);
    onTimeChange?.(newTime.selectedTime);
  };

  const updateMinutes = (
    minutes: number,
    additionalChanges: Partial<TimePickerContextType["timePickerState"]> = {},
  ) => {
    const updatedTime = {
      ...timePickerState,
      selectedTime: {
        ...timePickerState.selectedTime,
        minutes: Math.max(0, Math.min(59, minutes)),
      },
      ...additionalChanges,
    };

    setTimePickerState(updatedTime);
    onTimeChange?.(updatedTime.selectedTime);
  };

  const updateSeconds = (seconds: number) => {
    const updatedTime = {
      ...timePickerState,
      selectedTime: {
        ...timePickerState.selectedTime,
        seconds: Math.max(0, Math.min(59, seconds)),
      },
    };

    onTimeChange?.(updatedTime.selectedTime);
    setTimePickerState(updatedTime);
  };

  const updatePeriod = (period: "AM" | "PM") => {
    if (timePickerState.format === "am/pm") {
      const updatedTime = {
        ...timePickerState,
        selectedTime: {
          ...timePickerState.selectedTime,
          period,
        },
      };
      onTimeChange?.(updatedTime.selectedTime);

      setTimePickerState(updatedTime);
    }
  };

  const incrementHours = () => {
    const currentHours = timePickerState.selectedTime.hours;
    if (timePickerState.format === "24hr") {
      updateHours(currentHours === 23 ? 0 : currentHours + 1);
    } else {
      updateHours(currentHours === 12 ? 1 : currentHours + 1);
    }
  };

  const decrementHours = () => {
    const currentHours = timePickerState.selectedTime.hours;
    if (timePickerState.format === "24hr") {
      updateHours(currentHours === 0 ? 23 : currentHours - 1);
    } else {
      updateHours(currentHours === 1 ? 12 : currentHours - 1);
    }
  };

  const incrementMinutes = () => {
    const currentMinutes = timePickerState.selectedTime.minutes;
    updateMinutes(currentMinutes === 59 ? 0 : currentMinutes + 1);
  };

  const decrementMinutes = () => {
    const currentMinutes = timePickerState.selectedTime.minutes;
    updateMinutes(currentMinutes === 0 ? 59 : currentMinutes - 1);
  };

  const incrementSeconds = () => {
    const currentSeconds = timePickerState.selectedTime.seconds;
    updateSeconds(currentSeconds === 59 ? 0 : currentSeconds + 1);
  };

  const decrementSeconds = () => {
    const currentSeconds = timePickerState.selectedTime.seconds;
    updateSeconds(currentSeconds === 0 ? 59 : currentSeconds - 1);
  };

  const togglePeriod = () => {
    if (
      timePickerState.format === "am/pm" &&
      timePickerState.selectedTime.period
    ) {
      updatePeriod(timePickerState.selectedTime.period === "AM" ? "PM" : "AM");
    }
  };

  const setVisibility = (isVisible: boolean) => {
    setTimePickerState((prevState) => ({
      ...prevState,
      isVisible,
    }));
    onVisibilityChange?.(isVisible);
  };

  const setTime = (newTime: TimeValue) => {
    setTimePickerState((prevState) => ({
      ...prevState,
      selectedTime: {
        ...prevState.selectedTime,
        ...newTime,
      },
    }));
  };

  const getFormattedTime = (selectedTime?: TimeValue): string => {
    const { hours, minutes, seconds, period } =
      selectedTime ?? timePickerState.selectedTime;
    const formattedHours = hours.toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedSeconds = seconds.toString().padStart(2, "0");
    const { shouldInclude } = timePickerState;

    if (timePickerState.format === "am/pm") {
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds} ${period}`;
    }

    let formatteTimeString: string = "";
    if (shouldInclude.hours) formatteTimeString += `${formattedHours}:`;
    if (shouldInclude.minutes) formatteTimeString += `${formattedMinutes}:`;
    if (shouldInclude.seconds) {
      formatteTimeString += `${formattedSeconds}`;
    } else {
      formatteTimeString = formatteTimeString.slice(0, -1);
    }
    return formatteTimeString.trimEnd();
  };

  const setCurrentInputPosition = (position: InputPosition) => {
    setTimePickerState((prevState) => ({
      ...prevState,
      currentInputPosition: position,
      inputBuffer: "", // Clear buffer when changing position
    }));
  };

  const handleKeyInput = (key: string): boolean => {
    const { shouldInclude } = timePickerState;

    // Only handle numeric input
    if (!/^\d$/.test(key)) return false;

    const digit = parseInt(key);
    const { currentInputPosition, inputBuffer, format } = timePickerState;

    switch (currentInputPosition) {
      case "hours": {
        const newBuffer = inputBuffer + digit;

        if (newBuffer.length === 1) {
          // First digit of hours - implement smart placement
          if (format === "24hr") {
            // 24hr format: behave like minutes/seconds but bounded by 23
            if (digit >= 0 && digit <= 2) {
              // Smart placement: 0-2 as tens digit (X0)
              const smartValue = digit * 10;
              updateHours(smartValue);
              setTimePickerState((prevState) => ({
                ...prevState,
                inputBuffer: newBuffer,
              }));
              return true;
            } else {
              // 3-9: place as ones digit (0X), complete and advance
              updateHours(digit);
              setTimePickerState((prevState) => ({
                ...prevState,
                currentInputPosition: shouldInclude.minutes
                  ? "minutes"
                  : shouldInclude.seconds
                    ? "seconds"
                    : "hours",
                inputBuffer: "",
              }));
              return true;
            }
          } else {
            // 12hr format
            if (digit === 0) {
              // Show 0 immediately and wait for second digit
              updateHours(digit);
              setTimePickerState((prevState) => ({
                ...prevState,
                inputBuffer: newBuffer,
              }));
              return true;
            } else if (digit === 1) {
              // Smart placement: 1 -> 10, wait for next digit (could be 10, 11, 12)
              updateHours(10);
              setTimePickerState((prevState) => ({
                ...prevState,
                inputBuffer: newBuffer,
              }));
              return true;
            } else {
              // 2-9: use as direct hour, complete and advance
              updateHours(digit);
              setTimePickerState((prevState) => ({
                ...prevState,
                currentInputPosition: shouldInclude.minutes
                  ? "minutes"
                  : shouldInclude.seconds
                    ? "seconds"
                    : "hours",
                inputBuffer: "",
              }));
              return true;
            }
          }
        } else if (newBuffer.length === 2) {
          // Second digit of hours
          const hours = parseInt(newBuffer);

          if (format === "24hr") {
            if (hours <= 23) {
              updateHours(hours);
              setTimePickerState((prevState) => ({
                ...prevState,
                currentInputPosition: shouldInclude.minutes
                  ? "minutes"
                  : shouldInclude.seconds
                    ? "seconds"
                    : "hours",
                inputBuffer: "",
              }));
              return true;
            }
          } else {
            if (hours >= 1 && hours <= 12) {
              updateHours(hours);
              setTimePickerState((prevState) => ({
                ...prevState,
                currentInputPosition: shouldInclude.minutes
                  ? "minutes"
                  : shouldInclude.seconds
                    ? "seconds"
                    : "hours",
                inputBuffer: "",
              }));
              return true;
            }
          }
          // Invalid hour, reset buffer
          setTimePickerState((prevState) => ({
            ...prevState,
            inputBuffer: "",
          }));
          return false;
        }
        break;
      }

      case "minutes": {
        const newBuffer = inputBuffer + digit;

        if (newBuffer.length === 1) {
          // First digit of minutes - implement smart placement
          if (digit >= 0 && digit <= 5) {
            // Smart placement: 0-5 as tens digit (X0)
            const smartValue = digit * 10;
            updateMinutes(smartValue);
            setTimePickerState((prevState) => ({
              ...prevState,
              inputBuffer: newBuffer,
            }));
            return true;
          } else {
            // 6-9: place as ones digit (0X), complete and advance
            updateMinutes(digit);
            setTimePickerState((prevState) => ({
              ...prevState,
              currentInputPosition: shouldInclude.seconds
                ? "seconds"
                : shouldInclude.hours
                  ? "hours"
                  : "minutes",
              inputBuffer: "",
            }));
            return true;
          }
        } else if (newBuffer.length === 2) {
          // Second digit of minutes
          const minutes = parseInt(newBuffer);

          if (minutes <= 59) {
            // TODO: Implement this in every other update function.
            updateMinutes(minutes, {
              currentInputPosition: shouldInclude.seconds
                ? "seconds"
                : shouldInclude.hours
                  ? "hours"
                  : "minutes",
              inputBuffer: "",
            });

            return true;
          }
          // Invalid minute, reset buffer
          setTimePickerState((prevState) => ({
            ...prevState,
            inputBuffer: "",
          }));
          return false;
        }
        break;
      }

      case "seconds": {
        const newBuffer = inputBuffer + digit;

        if (newBuffer.length === 1) {
          // First digit of seconds - implement smart placement
          if (digit >= 0 && digit <= 5) {
            // Smart placement: 0-5 as tens digit (X0)
            const smartValue = digit * 10;
            updateSeconds(smartValue);
            setTimePickerState((prevState) => ({
              ...prevState,
              inputBuffer: newBuffer,
            }));
            return true;
          } else {
            // 6-9: place as ones digit (0X), complete (stay on seconds)
            updateSeconds(digit);
            setTimePickerState((prevState) => ({
              ...prevState,
              inputBuffer: "",
            }));
            return true;
          }
        } else if (newBuffer.length === 2) {
          // Second digit of seconds
          const seconds = parseInt(newBuffer);

          if (seconds <= 59) {
            updateSeconds(seconds);
            setTimePickerState((prevState) => ({
              ...prevState,
              inputBuffer: "",
            }));
            return true;
          }
          // Invalid second, reset buffer
          setTimePickerState((prevState) => ({
            ...prevState,
            currentInputPosition: shouldInclude.hours
              ? "hours"
              : shouldInclude.minutes
                ? "minutes"
                : "seconds",
            inputBuffer: "",
          }));
          return false;
        }
        break;
      }
    }

    return false;
  };

  const getFormattedTimeWithHighlight = (): {
    display: string;
    highlightedPart: string;
  } => {
    const { hours, minutes, seconds, period } = timePickerState.selectedTime;
    const { currentInputPosition, shouldInclude } = timePickerState;
    const {
      hours: includeHours,
      minutes: includeMinutes,
      seconds: includeSeconds,
    } = shouldInclude;

    const formattedHours = hours.toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedSeconds = seconds.toString().padStart(2, "0");

    let highlightedPart = "";

    switch (currentInputPosition) {
      case "hours":
        highlightedPart = formattedHours;
        break;
      case "minutes":
        highlightedPart = formattedMinutes;
        break;
      case "seconds":
        highlightedPart = formattedSeconds;
        break;
    }

    let display = "";
    if (includeHours) {
      display += `${formattedHours}:`;
    }
    if (includeMinutes) {
      display += `${formattedMinutes}:`;
    }
    if (includeSeconds) {
      display += `${formattedSeconds}`;
    }
    if (timePickerState.format === "am/pm") {
      display += `${period}`;
    }

    return { display, highlightedPart };
  };

  return {
    timePickerState,
    updateHours,
    updateMinutes,
    updateSeconds,
    updatePeriod,
    incrementHours,
    decrementHours,
    incrementMinutes,
    decrementMinutes,
    incrementSeconds,
    decrementSeconds,
    togglePeriod,
    setVisibility,
    getFormattedTime,
    setCurrentInputPosition,
    handleKeyInput,
    getFormattedTimeWithHighlight,
    setTime,
  };
};

type TimePickerProviderProps = {
  children: ReactNode;
  format?: TimeFormat;
  defaultTime?: Partial<TimeValue>;
  shouldInclude: {
    hours: boolean;
    minutes: boolean;
    seconds: boolean;
  };
};

export const TimePickerProvider = ({
  children,
  format = "am/pm",
  defaultTime = {},
  shouldInclude,
}: TimePickerProviderProps) => {
  const getDefaultHours = () => {
    if (format === "24hr") {
      return defaultTime.hours ?? 8;
    }
    return defaultTime.hours ?? 8;
  };

  const [timePickerState, setTimePickerState] = useState<
    TimePickerContextType["timePickerState"]
  >({
    isVisible: false,
    selectedTime: {
      hours: getDefaultHours(),
      minutes: defaultTime.minutes ?? 30,
      seconds: defaultTime.seconds ?? 45,
      period: format === "am/pm" ? (defaultTime.period ?? "PM") : undefined,
    },
    format,
    currentInputPosition: "hours",
    inputBuffer: "",
    shouldInclude: shouldInclude,
  });

  return (
    <TimePickerContext.Provider value={{ timePickerState, setTimePickerState }}>
      {children}
    </TimePickerContext.Provider>
  );
};
