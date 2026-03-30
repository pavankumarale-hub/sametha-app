import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Share, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ExpandableSametha } from '../../components/ExpandableSametha';
import {
  getFavourites, getGroups, createGroup, deleteGroup,
  moveFavouriteToGroup, removeFavourite,
  Favourite, Group, GROUP_COLORS,
} from '../../services/cloudFavorites';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Theme } from '../../theme';

export default function FavouritesScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [moveModal, setMoveModal] = useState<Favourite | null>(null);

  async function refresh() {
    const [favs, grps] = await Promise.all([getFavourites(user?.uid), getGroups(user?.uid)]);
    setFavourites(favs);
    setGroups(grps);
  }

  useFocusEffect(useCallback(() => { refresh(); }, [user]));

  const displayed = selectedGroup === null ? favourites : favourites.filter((f) => f.groupId === selectedGroup);

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    await createGroup(newGroupName.trim(), newGroupColor, user?.uid);
    setNewGroupName(''); setNewGroupColor(GROUP_COLORS[0]); setShowNewGroup(false);
    refresh();
  }

  async function handleDeleteGroup(g: Group) {
    Alert.alert(`Delete "${g.name}"?`, 'Saamethas will be moved to All.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGroup(g.id, user?.uid); if (selectedGroup === g.id) setSelectedGroup(null); refresh(); } },
    ]);
  }

  async function handleMove(fav: Favourite, groupId: string | null) {
    await moveFavouriteToGroup(fav.id, groupId, user?.uid);
    setMoveModal(null); refresh();
  }

  const groupColor = (id: string) => groups.find((g) => g.id === id)?.color ?? theme.textMuted;

  return (
    <View style={s.container}>
      {/* Group tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        <TouchableOpacity style={[s.tab, selectedGroup === null && { borderColor: theme.primary, backgroundColor: theme.primary + '22' }]} onPress={() => setSelectedGroup(null)}>
          <Text style={[s.tabText, selectedGroup === null && { color: theme.primary }]}>All ({favourites.length})</Text>
        </TouchableOpacity>
        {groups.map((g) => (
          <TouchableOpacity key={g.id} style={[s.tab, selectedGroup === g.id && { borderColor: g.color, backgroundColor: g.color + '22' }]}
            onPress={() => setSelectedGroup(g.id)} onLongPress={() => handleDeleteGroup(g)}>
            <View style={[s.groupDot, { backgroundColor: g.color }]} />
            <Text style={[s.tabText, selectedGroup === g.id && { color: g.color }]}>
              {g.name} ({favourites.filter((f) => f.groupId === g.id).length})
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.addGroupBtn} onPress={() => setShowNewGroup(true)}>
          <MaterialIcons name="add" size={16} color={theme.primary} />
          <Text style={[s.tabText, { color: theme.primary }]}>New Group</Text>
        </TouchableOpacity>
      </ScrollView>

      {!user && (
        <View style={s.syncBanner}>
          <MaterialIcons name="cloud-off" size={16} color={theme.gold} />
          <Text style={s.syncText}>Sign in to sync across devices</Text>
        </View>
      )}

      {displayed.length === 0 ? (
        <View style={s.empty}>
          <MaterialIcons name="favorite-border" size={52} color={theme.border} />
          <Text style={s.emptyTitle}>{selectedGroup ? 'No saamethas in this group' : 'No favourites yet'}</Text>
          <Text style={s.emptySub}>Tap the heart icon on any sametha to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => (
            <ExpandableSametha
              text={item.text}
              theme={theme}
              accentColor={item.groupId ? groupColor(item.groupId) : theme.primary}
              actions={
                <>
                  <TouchableOpacity style={s.actionBtn} onPress={() => setMoveModal(item)} hitSlop={8}>
                    <MaterialIcons name="folder-open" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => Share.share({ message: `"${item.text}"\n\n— via Sametha App` })} hitSlop={8}>
                    <MaterialIcons name="share" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={async () => { await removeFavourite(item.id, user?.uid); refresh(); }} hitSlop={8}>
                    <MaterialIcons name="favorite" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </>
              }
            />
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: 32, gap: 8 }}
        />
      )}

      {/* New Group Modal */}
      <Modal visible={showNewGroup} transparent animationType="slide" onRequestClose={() => setShowNewGroup(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>New Group</Text>
            <TextInput style={s.modalInput} placeholder="e.g. Morning Wisdom" placeholderTextColor={theme.textMuted}
              value={newGroupName} onChangeText={setNewGroupName} autoFocus />
            <Text style={s.colorLabel}>Pick a colour</Text>
            <View style={s.colorRow}>
              {GROUP_COLORS.map((c) => (
                <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c }, newGroupColor === c && s.colorDotActive]} onPress={() => setNewGroupColor(c)} />
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowNewGroup(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalCreate, { backgroundColor: newGroupColor }]} onPress={handleCreateGroup}>
                <Text style={s.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move to Group Modal */}
      <Modal visible={!!moveModal} transparent animationType="fade" onRequestClose={() => setMoveModal(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setMoveModal(null)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Move to Group</Text>
            <TouchableOpacity style={s.moveRow} onPress={() => moveModal && handleMove(moveModal, null)}>
              <MaterialIcons name="clear" size={18} color={theme.textMuted} />
              <Text style={s.moveRowText}>No group (All)</Text>
            </TouchableOpacity>
            {groups.map((g) => (
              <TouchableOpacity key={g.id} style={s.moveRow} onPress={() => moveModal && handleMove(moveModal, g.id)}>
                <View style={[s.groupDot, { backgroundColor: g.color }]} />
                <Text style={s.moveRowText}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    tabsScroll: { maxHeight: 54, borderBottomWidth: 1, borderBottomColor: theme.border },
    tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
    tabText: { fontSize: 13, color: theme.textSub, fontWeight: '600' },
    groupDot: { width: 8, height: 8, borderRadius: 4 },
    addGroupBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.primary + '55' },
    syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.gold + '18', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.gold + '33' },
    syncText: { fontSize: 13, color: theme.gold },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: theme.textMuted, marginTop: 14 },
    emptySub: { fontSize: 14, color: theme.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    actionBtn: { padding: 8 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalSheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 },
    modalInput: { backgroundColor: theme.surface2, borderRadius: 12, padding: 14, fontSize: 15, color: theme.text, borderWidth: 1, borderColor: theme.border },
    colorLabel: { fontSize: 13, color: theme.textMuted, marginTop: 16, marginBottom: 10 },
    colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    colorDot: { width: 32, height: 32, borderRadius: 16 },
    colorDotActive: { borderWidth: 3, borderColor: theme.text },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    modalCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.surface2, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    modalCancelText: { color: theme.textSub, fontWeight: '600', fontSize: 15 },
    modalCreate: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
    modalCreateText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    moveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
    moveRowText: { fontSize: 15, color: theme.text },
  });
}
