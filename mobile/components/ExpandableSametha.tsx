import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getMeaning, MeaningData } from '../services/meanings';
import { Theme } from '../theme';

interface Props {
  text: string;
  theme: Theme;
  accentColor?: string;
  actions: React.ReactNode;
}

export function ExpandableSametha({ text, theme, accentColor, actions }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [meaning, setMeaning] = useState<MeaningData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  async function handlePress() {
    if (!expanded && !fetched.current) {
      fetched.current = true;
      setLoading(true);
      const result = await getMeaning(text);
      setMeaning(result.data);
      setError(result.error);
      setLoading(false);
    }
    setExpanded((v) => !v);
  }

  const accent = accentColor ?? theme.primary;
  const s = styles(theme, accent);

  return (
    <View style={s.card}>
      <View style={s.accent} />
      <View style={s.body}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={s.header}>
          <Text style={s.samethaText}>{text}</Text>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={theme.textMuted}
          />
        </TouchableOpacity>

        {expanded && (
          <View style={s.expansion}>
            {loading ? (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={accent} />
                <Text style={s.loadingText}>Loading meaning...</Text>
              </View>
            ) : error ? (
              <Text style={s.errorText}>{error}</Text>
            ) : meaning ? (
              <>
                <View style={s.meaningHeader}>
                  <MaterialIcons name="menu-book" size={14} color={accent} />
                  <Text style={[s.label, { color: accent }]}>MEANING</Text>
                </View>
                <Text style={s.meaningText}>{meaning.meaning}</Text>

                <View style={s.exampleHeader}>
                  <MaterialIcons name="chat-bubble-outline" size={13} color={accent} />
                  <Text style={[s.label, { color: accent }]}>EXAMPLE</Text>
                </View>
                <Text style={s.contextText}>{meaning.example.context}</Text>
                <View style={s.conversation}>
                  {meaning.example.conversation.map((line, i) => (
                    <View key={i} style={s.convLine}>
                      <Text style={[s.speaker, { color: accent }]}>{line.speaker}:</Text>
                      <Text style={s.line}>{line.line}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        )}

        <View style={s.actions}>{actions}</View>
      </View>
    </View>
  );
}

function styles(theme: Theme, accent: string) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    accent: { width: 3, backgroundColor: accent },
    body: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 13,
      paddingBottom: 6,
      gap: 8,
    },
    samethaText: { flex: 1, fontSize: 14, color: theme.text, lineHeight: 21 },
    expansion: {
      paddingHorizontal: 12,
      paddingBottom: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 4,
      paddingTop: 12,
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    loadingText: { fontSize: 13, color: theme.textMuted },
    errorText: { fontSize: 13, color: theme.textMuted, fontStyle: 'italic' },
    meaningHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
    exampleHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, marginBottom: 5 },
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
    meaningText: { fontSize: 13, color: theme.text, lineHeight: 20 },
    contextText: { fontSize: 12, color: theme.textSub, fontStyle: 'italic', marginBottom: 8, lineHeight: 18 },
    conversation: {
      backgroundColor: theme.surface2,
      borderRadius: 10,
      padding: 10,
      gap: 7,
      borderLeftWidth: 2,
      borderLeftColor: accent + '88',
    },
    convLine: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    speaker: { fontSize: 13, fontWeight: '700', minWidth: 44 },
    line: { flex: 1, fontSize: 13, color: theme.text, lineHeight: 19 },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingRight: 8,
      paddingBottom: 8,
      gap: 4,
    },
  });
}
