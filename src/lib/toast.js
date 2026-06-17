import { toast } from "sonner";

export const showSuccess = (message) => toast.success(message);
export const showError = (message) => toast.error(message);
export const showInfo = (message) => toast.info(message);

export const extractApiMessage = (input, fallback = "Something went wrong") => {
  if (!input) return fallback;
  if (typeof input === "string") return input;
  return (
    input?.response?.data?.message ||
    input?.response?.data?.detail ||
    input?.response?.data?.non_field_errors?.[0] ||
    input?.data?.message ||
    input?.message ||
    fallback
  );
};
