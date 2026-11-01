/* Optional date (YYYY-MM-DD). Native picker on Android/iOS, typed input on web. */
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { fmtDate, today, validDay } from '@/lib/fic';
import { Input, Pill, Txt } from './kit';
import { Sheet } from './Sheet';
import { useTheme } from './theme';

const toDate = (v: string) => new Date((v || today()) + 'T12:00:00');
const toDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosValue, setIosValue] = useState(toDate(value));

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <Txt v="pixel" size={12} color={t.ink2} style={{ marginBottom: 4, marginLeft: 2 }}>{label}</Txt>
        <Input
          defaultValue={value}
          placeholder="YYYY-MM-DD"
          accessibilityLabel={`${label} date`}
          onEndEditing={(e) => onChange(validDay(e.nativeEvent.text))}
          onBlur={(e) => onChange(validDay((e.target as unknown as { value?: string }).value))}
        />
      </View>
    );
  }

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'date',
        onChange: (e: DateTimePickerEvent, d?: Date) => { if (e.type === 'set' && d) onChange(toDay(d)); },
      });
    } else {
      setIosValue(toDate(value));
      setIosOpen(true);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Txt v="pixel" size={12} color={t.ink2} style={{ marginBottom: 4, marginLeft: 2 }}>{label}</Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} date: ${value ? fmtDate(value) : 'not set'}`}
        onPress={open}
        onLongPress={() => value && onChange('')}
        style={{
          minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: t.softLine, backgroundColor: t.field,
          paddingHorizontal: 12, justifyContent: 'center',
        }}
      >
        <Txt color={value ? t.ink : t.muted}>{value ? fmtDate(value) : 'Not set'}</Txt>
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Sheet
          visible={iosOpen}
          onClose={() => setIosOpen(false)}
          title={label}
          footer={(
            <>
              <Pill label="Clear" onPress={() => { onChange(''); setIosOpen(false); }} style={{ flex: 1 }} />
              <Pill label="Done" kind="pink" onPress={() => { onChange(toDay(iosValue)); setIosOpen(false); }} style={{ flex: 2 }} />
            </>
          )}
        >
          <DateTimePicker value={iosValue} mode="date" display="inline" onChange={(_, d) => d && setIosValue(d)} accentColor={t.pinkDeep} />
        </Sheet>
      ) : null}
    </View>
  );
}
