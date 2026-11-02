import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backupCsv, backupJson, draftsToFics, parseImportFile, planRestore, planSheetImport } from '@/lib/backup';
import { plural, today, type Fic } from '@/lib/fic';
import { pickFile, shareAssetFile, shareTextFile } from '@/lib/files';
import template from '../../../assets/templates/my-fic-archive-template.xlsx';
import type { FicDraft } from '@/lib/importers/rows';
import { useFeedback } from '@/state/feedback';
import { useLibrary } from '@/state/library';
import { Segmented } from '@/ui/common';
import { Lace, ScreenTitle, Sky } from '@/ui/decor';
import { Badge, Card, Pill, Txt } from '@/ui/kit';
import { Sheet } from '@/ui/Sheet';
import { ThemePicker } from '@/ui/ThemePicker';
import { TAB_BAR_HEIGHT, useTheme, type ThemePref } from '@/ui/theme';

type SheetPlan = { drafts: FicDraft[]; fresh: FicDraft[]; dups: number; skipped: number; sheets: number };
type RestorePlan = { fics: Fic[]; isNew: number; newer: number; changed: Fic[] };

export default function Backup() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const lib = useLibrary();
  const { toast, confirm } = useFeedback();
  const [sheetPlan, setSheetPlan] = useState<SheetPlan | null>(null);
  const [restorePlan, setRestorePlan] = useState<RestorePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const last = lib.ui.lastBackup;
  const days = last ? Math.floor((now - new Date(last).getTime()) / 864e5) : null;

  const choose = async () => {
    try {
      const file = await pickFile();
      if (!file) return;
      const parsed = parseImportFile(file.name, file.bytes);
      if (parsed.kind === 'sheet') {
        const { fresh, dups } = planSheetImport(parsed.drafts, lib.fics);
        setSheetPlan({ drafts: parsed.drafts, fresh, dups, skipped: parsed.skipped, sheets: parsed.sheets });
      } else {
        setRestorePlan({ fics: parsed.fics, ...planRestore(parsed.fics, lib.fics) });
      }
    } catch (e) {
      console.error(e);
      toast(e instanceof Error ? e.message : "Couldn't read that file");
    }
  };

  const doImport = async () => {
    if (!sheetPlan) return;
    setBusy(true);
    try {
      const fics = draftsToFics(sheetPlan.fresh);
      await lib.addMany(fics);
      setSheetPlan(null);
      toast(`Imported ${plural(fics.length, 'fic')} ♡`);
      router.navigate('/');
    } catch (e) {
      console.error(e);
      toast('Import failed. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async (mode: 'merge' | 'replace') => {
    if (!restorePlan) return;
    const plan = restorePlan;
    setRestorePlan(null);
    try {
      if (mode === 'merge') {
        await lib.addMany(plan.changed);
        toast(`Merged · ${plural(plan.changed.length, 'fic')} added or updated`);
      } else {
        const ok = await confirm({
          title: 'Replace your whole library?',
          message: `Your ${plural(lib.fics.length, 'fic')} will be replaced by the ${plan.fics.length} in this backup. Export a backup first if unsure.`,
          ok: 'Replace', danger: true,
        });
        if (!ok) return;
        await lib.replaceAll(plan.fics);
        toast(`Restored ${plural(plan.fics.length, 'fic')}`);
      }
      router.navigate('/');
    } catch (e) {
      console.error(e);
      toast('Restore failed. Nothing was changed.');
    }
  };

  const getTemplate = async () => {
    try {
      await shareAssetFile(template, 'my-fic-archive-template.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (e) {
      console.error(e);
      toast(e instanceof Error ? e.message : "Couldn't open the template");
    }
  };

  const exportAs = async (kind: 'json' | 'csv') => {
    try {
      const name = `fic-archive-${today()}.${kind}`;
      if (kind === 'json') await shareTextFile(name, backupJson(lib.fics), 'application/json');
      else await shareTextFile(name, backupCsv(lib.fics), 'text/csv');
      lib.setUI({ lastBackup: new Date().toISOString() });
      toast(`Exported ${plural(lib.fics.length, 'fic')}`);
    } catch (e) {
      console.error(e);
      toast(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 30 }}>
        <Lace><ScreenTitle>Backup & import</ScreenTitle></Lace>
        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          <Section title="Import a spreadsheet">
            <Txt size={14} color={t.ink2} style={{ marginBottom: 12 }}>
              .xlsx or .csv. Only <Txt v="heavy" size={14} color={t.ink2}>title</Txt> and <Txt v="heavy" size={14} color={t.ink2}>author</Txt> columns are needed; status, rating, favorite, tags, links, summary, thoughts and dates come in too when the sheet has them. Fics already in your library are skipped.
            </Txt>
            <Pill kind="pink" icon="plus" label="Choose spreadsheet" block onPress={choose} />
            <Pill icon="download" label="Get the Excel template" block onPress={getTemplate} style={{ marginTop: 10 }} />
          </Section>

          <Section title="Back up my library">
            <Txt size={14} color={t.ink2} style={{ marginBottom: 12 }}>
              {last ? `Last backup ${days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}. ` : "You haven't made a backup yet. "}
              Your library lives only on this phone, so save a copy now and then (e.g. to Google Drive).
            </Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pill kind="pink" label="Export JSON" onPress={() => exportAs('json')} style={{ flex: 1 }} />
              <Pill label="Export CSV" onPress={() => exportAs('csv')} style={{ flex: 1 }} />
            </View>
          </Section>

          <Section title="Restore from backup">
            <Txt size={14} color={t.ink2} style={{ marginBottom: 12 }}>
              {"Load a JSON or CSV file exported from this app. You'll choose to merge or replace before anything changes."}
            </Txt>
            <Pill label="Choose backup file" block onPress={choose} />
          </Section>

          <Section title="Appearance">
            <Segmented
              options={[{ k: 'system', label: 'System' }, { k: 'light', label: 'Light' }, { k: 'dark', label: 'Dark' }]}
              value={lib.ui.theme}
              onChange={(k) => lib.setUI({ theme: k as ThemePref })}
            />
            <View style={{ height: 14 }} />
            <ThemePicker
              value={lib.ui.palette}
              custom={lib.ui.customHues}
              onChange={(palette) => lib.setUI({ palette })}
              onCustom={(customHues) => lib.setUI({ customHues })}
            />
          </Section>

          <Section title="About this archive">
            <Row k="Fics saved" v={String(lib.fics.length)} />
            <Row k="Storage" v="On this device (SQLite)" />
            <Row k="Works offline" v={Platform.OS === 'web' ? 'In this browser' : 'Yes'} last />
          </Section>
        </View>
      </ScrollView>

      <Sheet
        visible={!!sheetPlan}
        onClose={() => setSheetPlan(null)}
        title="Import spreadsheet"
        footer={sheetPlan ? (
          <>
            <Pill label="Cancel" onPress={() => setSheetPlan(null)} style={{ flex: 1 }} />
            <Pill kind="pink" label={busy ? 'Importing…' : `Import ${sheetPlan.fresh.length}`} disabled={busy || !sheetPlan.fresh.length} onPress={doImport} style={{ flex: 1 }} />
          </>
        ) : null}
      >
        {sheetPlan ? (
          <>
            <Row k={`Fics found${sheetPlan.sheets > 1 ? ` (${sheetPlan.sheets} sheets)` : ''}`} v={String(sheetPlan.drafts.length)} />
            <Row k="New fics to add" v={String(sheetPlan.fresh.length)} />
            <Row k="Marked Ongoing (blue rows)" v={String(sheetPlan.fresh.filter((f) => f.ficStatus === 'Ongoing').length)} />
            <Row k="With a file link" v={String(sheetPlan.fresh.filter((f) => f.links.length).length)} />
            <Row k="Already in library (skipped)" v={String(sheetPlan.dups)} />
            <Row k="Blank / header / note rows skipped" v={String(sheetPlan.skipped)} last />
            {sheetPlan.fresh.length ? (
              <View style={{ borderWidth: 1.5, borderColor: t.softLine, borderRadius: 14, marginTop: 12 }}>
                {sheetPlan.fresh.slice(0, 50).map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: t.softLine }}>
                    <Txt size={14} numberOfLines={1} style={{ flex: 1 }}>{f.title} <Txt size={12} color={t.muted}>· {f.author}</Txt></Txt>
                    {f.ficStatus === 'Ongoing' ? <Badge kind="ongoing" label="Ongoing" /> : null}
                  </View>
                ))}
                {sheetPlan.fresh.length > 50 ? <Txt size={12} color={t.muted} style={{ padding: 10 }}>…and {sheetPlan.fresh.length - 50} more</Txt> : null}
              </View>
            ) : null}
            <Txt size={13} color={t.muted} style={{ marginTop: 10 }}>New fics are added as “Want to Read”. Nothing already in your library is changed.</Txt>
          </>
        ) : null}
      </Sheet>

      <Sheet visible={!!restorePlan} onClose={() => setRestorePlan(null)} title="Restore backup" footer={<Pill label="Cancel" onPress={() => setRestorePlan(null)} style={{ flex: 1 }} />}>
        {restorePlan ? (
          <>
            <Row k="Fics in backup" v={String(restorePlan.fics.length)} />
            <Row k="Not in library yet" v={String(restorePlan.isNew)} />
            <Row k="Newer than your copy" v={String(restorePlan.newer)} />
            <Row k="Currently in library" v={String(lib.fics.length)} last />
            <Txt v="pixel" size={14} color={t.ink2} style={{ marginTop: 18, marginBottom: 8 }}>How should I restore?</Txt>
            <Option title="Merge" text="Add missing fics, keep whichever copy was edited last" onPress={() => doRestore('merge')} />
            <Option title="Replace everything" text="Library becomes exactly this backup" onPress={() => doRestore('replace')} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={{ padding: 16 }}>
      <Txt v="pixel" size={17} accessibilityRole="header" style={{ marginBottom: 4 }}>{title}</Txt>
      {children}
    </Card>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: last ? 0 : 1, borderColor: t.softLine }}>
      <Txt size={14} style={{ flex: 1 }}>{k}</Txt>
      <Txt v="heavy" size={14}>{v}</Txt>
    </View>
  );
}

function Option({ title, text, onPress }: { title: string; text: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: t.softLine, backgroundColor: pressed ? t.lavSoft : t.card, marginBottom: 8 })}
    >
      <Txt v="heavy">{title}</Txt>
      <Txt size={13} color={t.muted}>{text}</Txt>
    </Pressable>
  );
}
