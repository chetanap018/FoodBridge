const primaryGreen = "#2E7D32";
const lightGreen = "#66BB6A";
const darkGreen = "#1B5E20";
const accentOrange = "#FF8F00";
const lightOrange = "#FFB300";
const warningRed = "#D32F2F";
const lightRed = "#EF5350";
const surfaceGreen = "#F1F8E9";
const backgroundWhite = "#FFFFFF";
const textDark = "#1B1B1B";
const textGrey = "#757575";
const textLight = "#9E9E9E";
const cardBg = "#FAFAFA";
const borderColor = "#E8F5E9";

export const Colors = {
  primary: primaryGreen,
  primaryDark: darkGreen,
  primaryLight: lightGreen,
  accent: accentOrange,
  accentLight: lightOrange,
  danger: warningRed,
  dangerLight: lightRed,
  surface: surfaceGreen,
  background: backgroundWhite,
  card: cardBg,
  textPrimary: textDark,
  textSecondary: textGrey,
  textLight: textLight,
  border: borderColor,

  expiry: {
    fresh: "#2E7D32",
    good: "#66BB6A",
    warning: "#FF8F00",
    danger: "#D32F2F",
    expired: "#9E9E9E",
  },

  dark: {
    background: "#0A1A0A",
    card: "#1A2E1A",
    surface: "#142014",
    border: "#1E3A1E",
    textPrimary: "#F1F8E9",
    textSecondary: "#A5C8A7",
    tabBar: "#0A1A0A",
  },
};

export default {
  light: {
    text: textDark,
    background: backgroundWhite,
    tint: primaryGreen,
    tabIconDefault: textGrey,
    tabIconSelected: primaryGreen,
  },
  dark: {
    text: "#F1F8E9",
    background: "#0A1A0A",
    tint: lightGreen,
    tabIconDefault: "#5A7A5A",
    tabIconSelected: lightGreen,
  },
};
