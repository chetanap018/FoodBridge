import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label, Badge } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Colors } from "@/constants/colors";
import { useApp, useIsDark } from '@/context/AppContext';

function NativeTabLayout() {
  const { notifications, profile } = useApp();
  const unreadCount = notifications.filter(n => !n.read).length;
  const isHousehold = profile.userCategory === 'Household';

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      {isHousehold && (
        <NativeTabs.Trigger name="pantry">
          <Icon sf={{ default: "basket", selected: "basket.fill" }} />
          <Label>Pantry</Label>
        </NativeTabs.Trigger>
      )}
      {isHousehold && (
        <NativeTabs.Trigger name="recipes">
          <Icon sf={{ default: "fork.knife", selected: "fork.knife" }} />
          <Label>Recipes</Label>
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="community">
        <Icon sf={{ default: "person.3", selected: "person.3.fill" }} />
        <Label>Community</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
        {unreadCount > 0 && <Badge>{unreadCount > 9 ? '9+' : String(unreadCount)}</Badge>}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isDark = useIsDark();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const { notifications, profile } = useApp();
  const unreadCount = notifications.filter(n => !n.read).length;
  const isHousehold = profile.userCategory === 'Household';

  const activeColor = isDark ? Colors.primaryLight : Colors.primary;
  const inactiveColor = isDark ? "#5A7A5A" : Colors.textLight;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: 10,
          marginBottom: 2,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? "#0A1A0A" : "#fff",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: isDark ? "#1E3A1E" : "#E8F5E9",
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#0A1A0A" : "#fff" }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          href: isHousehold ? undefined : null, // Hide if not household
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
          href: isHousehold ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "basket" : "basket-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          href: isHousehold ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "restaurant" : "restaurant-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="donate"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
