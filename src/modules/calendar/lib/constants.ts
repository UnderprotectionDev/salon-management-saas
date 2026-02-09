export const PIXELS_PER_MINUTE = 1.5;
export const HOUR_HEIGHT = PIXELS_PER_MINUTE * 60; // 90px
export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 20;
export const TOTAL_HOURS = DEFAULT_END_HOUR - DEFAULT_START_HOUR;

export const STATUS_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  pending: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
  },
  confirmed: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-800",
  },
  checked_in: {
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    text: "text-indigo-800",
  },
  in_progress: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-800",
  },
  completed: {
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-800",
  },
  cancelled: {
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-500",
  },
  no_show: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800" },
};
