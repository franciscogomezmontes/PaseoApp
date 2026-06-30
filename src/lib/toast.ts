import Toast from "react-native-toast-message";

export const showSuccess = (title: string, subtitle?: string) =>
  Toast.show({
    type: "success",
    text1: title,
    text2: subtitle,
    visibilityTime: 2500,
    position: "bottom",
  });

export const showError = (title: string, subtitle?: string) =>
  Toast.show({
    type: "error",
    text1: title,
    text2: subtitle,
    visibilityTime: 3500,
    position: "bottom",
  });

export const showInfo = (title: string, subtitle?: string) =>
  Toast.show({
    type: "info",
    text1: title,
    text2: subtitle,
    visibilityTime: 2500,
    position: "bottom",
  });
