import { useCallback } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { tap } from '@/ui/haptics';
import { useFeedback } from './feedback';
import { getTrash, setTrash } from './kv';
import { useLibrary } from './library';

export function useFicActions() {
  const lib = useLibrary();
  const { toast, confirm } = useFeedback();

  const toggleFav = useCallback(async (id: string) => {
    const f = lib.byId.get(id);
    if (!f) return;
    tap();
    try {
      const { fic } = await lib.patch(id, { favorite: !f.favorite });
      if (fic.favorite) toast('Added to favorites ♡');
    } catch {
      toast("Couldn't save. Your change wasn't stored.");
    }
  }, [lib, toast]);

  const open = useCallback((id: string) => router.push({ pathname: '/fic/[id]', params: { id } }), []);

  const openUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast("Couldn't open that link");
    }
  }, [toast]);

  const remove = useCallback(async (id: string) => {
    const fic = lib.byId.get(id);
    if (!fic) return false;
    const ok = await confirm({
      title: 'Delete this fic?',
      message: `“${fic.title}” by ${fic.author} and your thoughts on it will be removed.`,
      ok: 'Delete',
      danger: true,
    });
    if (!ok) return false;
    await lib.remove(id);
    if (fic.files.length) setTrash([...getTrash(), ...fic.files]);
    toast('Fic deleted', {
      action: 'Undo',
      ms: 7000,
      onAction: () => { lib.addMany([fic]).then(() => toast('Restored ♡')).catch(() => toast("Couldn't restore")); },
    });
    return true;
  }, [lib, confirm, toast]);

  return { toggleFav, open, openUrl, remove };
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
