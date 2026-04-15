import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#fcc419',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopWidth: 1,
          borderTopColor: '#222',
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Transações',
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sms-parser"
        options={{
          title: 'Importar',
          tabBarIcon: ({ color }) => <Ionicons name="phone-portrait-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="binth"
        options={{
          title: 'Binth',
          tabBarIcon: ({ color }) => <Ionicons name="sparkles-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
