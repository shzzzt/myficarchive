import { Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/ui/Icon';
import { Gloss, Txt } from '@/ui/kit';
import { tap } from '@/ui/haptics';
import { TAB_BAR_HEIGHT, useTheme } from '@/ui/theme';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Library', icon: 'book' },
  authors: { label: 'Authors', icon: 'user' },
  stats: { label: 'Stats', icon: 'chart' },
  backup: { label: 'Backup', icon: 'box' },
};


function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom,
        flexDirection: 'row', backgroundColor: t.panel,
        boxShadow: '0px -6px 16px rgba(79,127,214,0.15)',
      }}
    >
      {/* Scalloped lace edge along the top, like the header's. */}
      <Svg width={width} height={12} style={{ position: 'absolute', left: 0, top: -11 }} pointerEvents="none">
        <Defs>
          <Pattern id="tabScallop" width={22} height={12} patternUnits="userSpaceOnUse">
            <Circle cx={11} cy={12} r={11} fill={t.panel} />
          </Pattern>
        </Defs>
        <Rect width={width} height={12} fill="url(#tabScallop)" />
      </Svg>
      {state.routes.map((route, i) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const on = state.index === i;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={meta.label}
            onPress={() => { if (!on) { tap(); navigateToTab(route.key); } }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
          >
            {on ? (
              <Gloss style={{ width: 50, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={meta.icon} size={20} color={t.glossInk} />
              </Gloss>
            ) : (
              <View style={{ width: 50, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={meta.icon} size={22} color={t.muted} />
              </View>
            )}
            <Txt v="pixel" size={12} color={on ? t.pinkDeep : t.muted}>{meta.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.sky1 } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="authors" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="backup" />
    </Tabs>
  );
}
