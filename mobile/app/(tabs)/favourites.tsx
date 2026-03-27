import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Share, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getFavourites, getGroups, createGroup, deleteGroup,
  moveFavouriteToGroup, removeFavourite,
  Favourite, Group, GROUP_COLORS,
} from '../../services/cloudFavorites';
import { useAuth } from '../../context/AuthContext';
import { T } from '../../theme';

export default function FavouritesScreen() {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null); // null = All
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [moveModal, setMoveModal] = useState<Favourite | null>(null);

  async function refresh() {
    const [favs, grps] = await Promise.all([
      getFavourites(user?.uid),
      getGroups(user?.uid),
    ]);
    setFavourites(favs);
    setGroups(grps);
  }

  useFocusEffect(useCallback(() => { refresh(); }, [user]));

  const displayed = selectedGroup === null
    ? favourites
    : favourites.filter((f) => f.groupId === selectedGroup);

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    await createGroup(newGroupName.trim(), newGroupColor, user?.uid);
    setNewGroupName('');
    setNewGroupColor(GROUP_COLORS[0]);
    setShowNewGroup(false);
    refresh();
  }

  async function handleDeleteGroup(g: Group) {
    Alert.alert(
      `Delete "${g.name}"?`,
      'Saamethas in this group will be moved to All.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteGroup(g.id, user?.uid);
            if (selectedGroup === g.id) setSelectedGroup(null);
            refresh();
          },
        },
      ]
    );
  }

  async function handleMove(fav: Favourite, groupId: string | null) {
    await moveFavouriteToGroup(fav.id, groupId, user?.uid);
    setMoveModal(null);
    refresh();
  }

  async function handleRemove(fav: Favourite) {
    await removeFavourite(fav.id, user?.uid);
    refresh();
  }

  async function share(text: string) {
    await Share.share({ message: `"${text}"\n\n— via Sametha App` });
  }

  const groupColor = (id: string) => groups.find((g) => g.id === id)?.color ?? T.textMuted;

  return (
    <View style={styles.container}>
      {/* Group tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        <TouchableOpacity
          style={[styles.tab, selectedGroup === null && styles.tabActive]}
          onPress={() => setSelectedGroup(null)}
        >
          <Text style={[styles.tabText, selectedGroup === null && styles.tabTextActive]}>
            All ({favourites.length})
          </Text>
        </TouchableOpacity>

        {groups.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.tab, selectedGroup === g.id && { borderColor: g.color, backgroundColor: g.color + '22' }]}
            onPress={() => setSelectedGroup(g.id)}
            onLongPress={() => handleDeleteGroup(g)}
          >
            <View style={[styles.groupDot, { backgroundColor: g.color }]} />
            <Text style={[styles.tabText, selectedGroup === g.id && { color: g.color }]}>
              {g.name} ({favourites.filter((f) => f.groupId === g.id).length})
            </Text>
          </TouchableOpacity>
        ))}

        {/* New group button */}
        <TouchableOpacity style={styles.addGroupBtn} onPress={() => setShowNewGroup(true)}>
          <MaterialIcons name="add" size={16} color={T.primary} />
          <Text style={styles.addGroupText}>New Group</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Cloud sync banner (not signed in) */}
      {!user && (
        <View style={styles.syncBanner}>
          <MaterialIcons name="cloud-off" size={16} color={T.gold} />
          <Text style={styles.syncText}>Sign in to sync across devices</Text>
        </View>
      )}

      {/* Empty state */}
      {displayed.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="favorite-border" size={52} color={T.border} />
          <Text style={styles.emptyTitle}>
            {selectedGroup ? 'No saamethas in this group' : 'No favourites yet'}
          </Text>
          <Text style={styles.emptySub}>
            Tap the heart icon on any sametha to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.groupId && (
                <View style={[styles.groupBar, { backgroundColor: groupColor(item.groupId) }]} />
              )}
              <Text style={styles.rowText}>{item.text}</Text>
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => setMoveModal(item)} hitSlop={8}>
                  <MaterialIcons name="folder-open" size={18} color={T.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => share(item.text)} hitSlop={8}>
                  <MaterialIcons name="share" size={18} color={T.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={8}>
                  <MaterialIcons name="favorite" size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      {/* New Group Modal */}
      <Modal visible={showNewGroup} transparent animationType="slide" onRequestClose={() => setShowNewGroup(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group name (e.g. Morning Wisdom)"
              placeholderTextColor={T.textMuted}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <Text style={styles.colorLabel}>Pick a colour</Text>
            <View style={styles.colorRow}>
              {GROUP_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, newGroupColor === c && styles.colorDotActive]}
                  onPress={() => setNewGroupColor(c)}
                />
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowNewGroup(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCreate, { backgroundColor: newGroupColor }]} onPress={handleCreateGroup}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move to Group Modal */}
      <Modal visible={!!moveModal} transparent animationType="fade" onRequestClose={() => setMoveModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMoveModal(null)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Move to Group</Text>
            <TouchableOpacity style={styles.moveRow} onPress={() => moveModal && handleMove(moveModal, null)}>
              <MaterialIcons name="clear" size={18} color={T.textMuted} />
              <Text style={styles.moveRowText}>No group (All)</Text>
            </TouchableOpacity>
            {groups.map((g) => (
              <TouchableOpacity key={g.id} style={styles.moveRow} onPress={() => moveModal && handleMove(moveModal, g.id)}>
                <View style={[styles.groupDot, { backgroundColor: g.color }]} />
                <Text style={styles.moveRowText}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  tabsScroll: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: T.border },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.surface,
  },
  tabActive: { borderColor: T.primary, backgroundColor: T.primary + '22' },
  tabText: { fontSize: 13, color: T.textSub, fontWeight: '600' },
  tabTextActive: { color: T.primary },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  addGroupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: T.primary + '55',
  },
  addGroupText: { fontSize: 13, color: T.primary, fontWeight: '600' },
  syncBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.gold + '18', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: T.gold + '33',
  },
  syncText: { fontSize: 13, color: T.gold },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: T.textMuted, marginTop: 14 },
  emptySub: { fontSize: 14, color: T.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: T.bg,
  },
  groupBar: { width: 3, height: '100%', borderRadius: 2, marginRight: 12 },
  rowText: { flex: 1, fontSize: 15, color: T.text, lineHeight: 22, marginRight: 8 },
  rowActions: { flexDirection: 'row', gap: 14 },
  sep: { height: 1, backgroundColor: T.border, marginLeft: 16 },
  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: {
    backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 16 },
  modalInput: {
    backgroundColor: T.surface2, borderRadius: 12, padding: 14,
    fontSize: 15, color: T.text, borderWidth: 1, borderColor: T.border,
  },
  colorLabel: { fontSize: 13, color: T.textMuted, marginTop: 16, marginBottom: 10 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: {
    flex: 1, padding: 14, borderRadius: 12, backgroundColor: T.surface2,
    alignItems: 'center', borderWidth: 1, borderColor: T.border,
  },
  modalCancelText: { color: T.textSub, fontWeight: '600', fontSize: 15 },
  modalCreate: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalCreateText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  moveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  moveRowText: { fontSize: 15, color: T.text },
});
