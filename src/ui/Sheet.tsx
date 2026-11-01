/* Bottom sheet built on Modal: fading scrim + sliding panel. */
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from './kit';
import { useTheme } from './theme';

// `maxHeight` is a share of the screen; `see` keeps the screen behind barely dimmed, for live previews.
export function Sheet({ visible, onClose, title, children, footer, maxHeight = 0.88, see }: {
  visible: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode; maxHeight?: number; see?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [y] = useState(() => new Animated.Value(height));

  useEffect(() => {
    if (visible) {
      y.setValue(height);
      Animated.timing(y, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    }
  }, [visible, height, y]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: see ? 'rgba(20,20,40,0.12)' : t.scrim }]} />
        <Animated.View
          accessibilityViewIsModal
          style={{
            transform: [{ translateY: y }], maxHeight: height * maxHeight, width: '100%', maxWidth: 560, alignSelf: 'center',
            backgroundColor: t.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1.5, borderBottomWidth: 0, borderColor: t.line,
          }}
        >
          <View style={{ width: 44, height: 5, borderRadius: 9, backgroundColor: t.softLine, alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: footer ? 8 : insets.bottom + 18 }} keyboardShouldPersistTaps="handled">
            {title ? <Txt v="display" size={13} accessibilityRole="header" style={{ marginBottom: 16 }}>{title}</Txt> : null}
            {children}
          </ScrollView>
          {footer ? (
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 16 }}>{footer}</View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetHeading({ children }: { children: string }) {
  const t = useTheme();
  return <Txt v="pixel" size={14} color={t.ink2} style={{ marginTop: 18, marginBottom: 8 }}>{children}</Txt>;
}
