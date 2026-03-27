import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { T } from '../../theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <MaterialIcons name={name} size={24} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: T.bg },
        headerTintColor: T.text,
        headerTitleStyle: { fontWeight: '700', color: T.text },
        tabBarActiveTintColor: T.primary,
        tabBarInactiveTintColor: T.textMuted,
        tabBarStyle: {
          backgroundColor: T.surface,
          borderTopColor: T.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today's Sametha",
          tabBarLabel: 'Today',
          tabBarIcon: ({ color }) => <TabIcon name="wb-sunny" color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color }) => <TabIcon name="menu-book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          title: 'Favourites',
          tabBarIcon: ({ color }) => <TabIcon name="favorite" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
