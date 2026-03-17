import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  Animated, StyleSheet, Dimensions, StatusBar, Platform,
  SafeAreaView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW, height: SH } = Dimensions.get('window');

// ── DATA ───────────────────────────────────────────────────────────────────
const RANKS = [
  { level: 1,  title: 'RECRUE',      xp: 0,    insignia: '▪' },
  { level: 2,  title: 'SOLDAT',      xp: 100,  insignia: '▸' },
  { level: 3,  title: 'CAPORAL',     xp: 250,  insignia: '▸▸' },
  { level: 4,  title: 'SERGENT',     xp: 500,  insignia: '▲' },
  { level: 5,  title: 'LIEUTENANT',  xp: 900,  insignia: '▲▲' },
  { level: 6,  title: 'CAPITAINE',   xp: 1500, insignia: '★' },
  { level: 7,  title: 'MAJOR',       xp: 2200, insignia: '★★' },
  { level: 8,  title: 'COLONEL',     xp: 3200, insignia: '★★★' },
  { level: 9,  title: 'GÉNÉRAL',     xp: 5000, insignia: '☆★☆' },
];

const LOADOUTS = [
  { id: 'assault', name: 'ASSAULT',  icon: '⚔',  color: '#4ade80' },
  { id: 'stealth', name: 'STEALTH',  icon: '👁',  color: '#38bdf8' },
  { id: 'support', name: 'SUPPORT',  icon: '🛡',  color: '#fb923c' },
  { id: 'recon',   name: 'RECON',    icon: '🔭',  color: '#facc15' },
];

const THREAT = {
  hard:   { color: '#ef4444', xp: 40, tag: 'HIGH' },
  medium: { color: '#f59e0b', xp: 25, tag: 'MED'  },
  easy:   { color: '#4ade80', xp: 10, tag: 'LOW'  },
};

const DEFAULT_MISSIONS = [
];

const SAVE_KEY = 'missioncontrol_v1';
const OP_CODES = ['CHARLIE','ECHO','FOXTROT','INDIA','KILO','LIMA','OSCAR','PAPA','ROMEO','SIERRA','TANGO'];

function getRank(xp) {
  let r = RANKS[0];
  for (const rank of RANKS) { if (xp >= rank.xp) r = rank; }
  return r;
}
function getNextRank(xp) {
  for (const r of RANKS) { if (xp < r.xp) return r; }
  return null;
}

// ── XP BAR ─────────────────────────────────────────────────────────────────
function XPBar({ xp, color }) {
  const rank = getRank(xp);
  const next = getNextRank(xp);
  const pct = next ? ((xp - rank.xp) / (next.xp - rank.xp)) : 1;
  const anim = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct]);

  const barWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ flex: 1, minWidth: 120 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={[s.mono, { fontSize: 9, color: '#facc15' }]}>{xp} XP</Text>
        {next && <Text style={[s.mono, { fontSize: 8, color: '#4b5563' }]}>→ {next.title} à {next.xp}</Text>}
      </View>
      <View style={{ height: 4, backgroundColor: '#111', borderRadius: 2 }}>
        <Animated.View style={{
          height: 4, width: barWidth, borderRadius: 2,
          backgroundColor: color,
          shadowColor: color, shadowOpacity: 0.8, shadowRadius: 4,
        }} />
      </View>
    </View>
  );
}

// ── KILL FEED ──────────────────────────────────────────────────────────────
function KillFeed({ items }) {
  return (
    <View style={{ position: 'absolute', top: 80, right: 12, zIndex: 999, gap: 4 }}>
      {items.map(item => (
        <KillFeedItem key={item.id} item={item} />
      ))}
    </View>
  );
}

function KillFeedItem({ item }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(1500),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 120, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      opacity, transform: [{ translateX }],
      backgroundColor: '#000000cc',
      borderLeftWidth: 3, borderLeftColor: item.color,
      borderWidth: 1, borderColor: item.color + '44',
      paddingHorizontal: 12, paddingVertical: 6,
      flexDirection: 'row', gap: 10, alignItems: 'center',
    }}>
      <Text style={[s.body, { fontSize: 9, color: '#9ca3af', letterSpacing: 2 }]}>
        NEUTRALISÉ
      </Text>
      <Text style={[s.body, { fontSize: 11, color: item.color, fontWeight: '700' }]}>
        +{item.xp} XP
      </Text>
    </Animated.View>
  );
}

// ── RANK UP OVERLAY ────────────────────────────────────────────────────────
function RankUpOverlay({ rank, onDone }) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(2000),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000dd', justifyContent: 'center', alignItems: 'center', zIndex: 9999, opacity }]}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
        <Text style={[s.title, { fontSize: 12, color: '#4ade80', letterSpacing: 8, marginBottom: 12 }]}>PROMOTION</Text>
        <Text style={[s.title, { fontSize: 64, color: '#facc15', textShadowColor: '#facc15', textShadowRadius: 20 }]}>
          {rank.insignia}
        </Text>
        <Text style={[s.title, { fontSize: 32, color: '#fff', letterSpacing: 6, marginTop: 8 }]}>{rank.title}</Text>
        <Text style={[s.body, { fontSize: 11, color: '#4ade80', letterSpacing: 4, marginTop: 8 }]}>NIVEAU {rank.level}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ── EDIT MODAL ─────────────────────────────────────────────────────────────
function EditModal({ visible, item, onSave, onClose, color }) {
  const [text, setText] = useState('');
  const [diff, setDiff] = useState('medium');
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && item) {
      setText(item.text);
      setDiff(item.diff);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000cc', justifyContent: 'flex-end', zIndex: 999, opacity: opacityAnim }]}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      <Animated.View style={{
        backgroundColor: '#0a0a0a', borderTopWidth: 2, borderTopColor: color,
        padding: 20, transform: [{ translateY: slideAnim }],
      }}>
        <Text style={[s.mono, { fontSize: 10, color, letterSpacing: 4, marginBottom: 16 }]}>✏ MODIFIER</Text>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Nom..."
          placeholderTextColor="#4b5563"
          style={[s.input, { marginBottom: 12, fontSize: 14 }]}
          autoFocus
        />

        <Text style={[s.mono, { fontSize: 8, color: '#4b5563', letterSpacing: 3, marginBottom: 8 }]}>NIVEAU DE MENACE</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {['easy','medium','hard'].map(d => (
            <TouchableOpacity key={d} onPress={() => setDiff(d)} style={{
              flex: 1, paddingVertical: 8, alignItems: 'center',
              backgroundColor: diff === d ? THREAT[d].color : '#1f2937',
              borderRadius: 2,
            }}>
              <Text style={[s.mono, { fontSize: 9, color: diff === d ? '#000' : '#6b7280' }]}>
                {d === 'easy' ? 'LOW' : d === 'medium' ? 'MED' : 'HIGH'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={onClose} style={[s.btn, { flex: 1, borderColor: '#374151' }]}>
            <Text style={[s.mono, { fontSize: 9, color: '#6b7280', letterSpacing: 2 }]}>ANNULER</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { if (text.trim()) { onSave(text.trim(), diff); onClose(); }}}
            style={[s.btn, { flex: 2, borderColor: color, backgroundColor: color + '22' }]}
          >
            <Text style={[s.mono, { fontSize: 9, color, letterSpacing: 2 }]}>▣ SAUVEGARDER</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ── OBJECTIVE CARD ─────────────────────────────────────────────────────────
function ObjectiveCard({ obj, onComplete, focusId, onFocus, color, onDelete, onEdit }) {
  const threat = THREAT[obj.diff];
  const isFocus = focusId === obj.id;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [editing, setEditing] = useState(false);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => onFocus(obj.id));
  };

  const handleDelete = () => {
    Alert.alert('Supprimer ?', `"${obj.text}"`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(obj.id) },
    ]);
  };

  return (
    <>
      <EditModal
        visible={editing} item={obj} color={color}
        onClose={() => setEditing(false)}
        onSave={(text, diff) => onEdit(obj.id, text, diff)}
      />
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={[s.card, {
            width: SW * 0.42,
            borderColor: obj.done ? '#166534' : isFocus ? color : threat.color + '44',
            borderTopWidth: 2,
            borderTopColor: obj.done ? '#166534' : threat.color,
            backgroundColor: obj.done ? '#052e1699' : isFocus ? '#0a1a0a' : '#0a0a0aee',
            marginBottom: 0,
          }]}
        >
          <Text style={[s.mono, { fontSize: 7, color: obj.done ? '#166534' : threat.color, letterSpacing: 2, marginBottom: 4 }]}>
            ◈ {threat.tag}
          </Text>
          <Text style={[s.body, {
            fontSize: 12, color: obj.done ? '#4ade8066' : '#d1d5db',
            textDecorationLine: obj.done ? 'line-through' : 'none',
            marginBottom: 6, lineHeight: 16,
          }]}>{obj.text}</Text>
          <Text style={[s.body, { fontSize: 9, color: '#facc15', marginBottom: 8 }]}>+{threat.xp} XP</Text>
          {!obj.done && (
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={() => onComplete(obj)} style={[s.btn, { borderColor: '#4ade8066', backgroundColor: '#052e1688', flex: 1 }]}>
                <Text style={[s.body, { fontSize: 8, color: '#4ade80', letterSpacing: 1 }]}>▣ FAIT</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(true)} style={[s.btn, { borderColor: '#38bdf844', paddingHorizontal: 8 }]}>
                <Text style={[s.body, { fontSize: 10, color: '#38bdf8' }]}>✏</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={[s.btn, { borderColor: '#ef444444', paddingHorizontal: 8 }]}>
                <Text style={[s.body, { fontSize: 10, color: '#ef4444' }]}>🗑</Text>
              </TouchableOpacity>
            </View>
          )}
          {obj.done && (
            <TouchableOpacity onPress={handleDelete} style={[s.btn, { borderColor: '#ef444433' }]}>
              <Text style={[s.mono, { fontSize: 8, color: '#ef444488', letterSpacing: 1 }]}>🗑 SUPPRIMER</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

// ── MISSION CARD ───────────────────────────────────────────────────────────
function MissionCard({ mission, onComplete, onAddObj, focusId, onFocus, color, onDelete, onEdit, onDeleteObj, onEditObj }) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newText, setNewText] = useState('');
  const [newDiff, setNewDiff] = useState('medium');
  const threat = THREAT[mission.diff];
  const isFocus = focusId === mission.id;
  const objDone = mission.objectives?.filter(o => o.done).length || 0;
  const objTotal = mission.objectives?.length || 0;
  const progressPct = objTotal > 0 ? objDone / objTotal : 0;
  const progressAnim = useRef(new Animated.Value(progressPct)).current;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progressPct, duration: 500, useNativeDriver: false }).start();
  }, [progressPct]);

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const handleAddObj = () => {
    if (!newText.trim()) return;
    onAddObj(mission.id, newText.trim(), newDiff);
    setNewText(''); setAdding(false);
  };

  const handleDelete = () => {
    Alert.alert('Supprimer la mission ?', `"${mission.text}" et tous ses objectifs seront supprimés.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(mission.id) },
    ]);
  };

  return (
    <>
      <EditModal
        visible={editing} item={mission} color={color}
        onClose={() => setEditing(false)}
        onSave={(text, diff) => onEdit(mission.id, text, diff)}
      />
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => onFocus(mission.id)}
          activeOpacity={0.85}
          style={[s.card, {
            borderColor: mission.done ? '#166534' : isFocus ? color : '#1f2937',
            borderTopWidth: 3,
            borderTopColor: mission.done ? '#166534' : threat.color,
            backgroundColor: mission.done ? '#052e1699' : isFocus ? '#0a1a0a' : '#0a0a0aee',
          }]}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[s.mono, { fontSize: 8, color: '#4b5563', letterSpacing: 2 }]}>{mission.code}</Text>
            <View style={[s.badge, { backgroundColor: (mission.done ? '#166534' : threat.color) + '22', borderColor: (mission.done ? '#166534' : threat.color) + '66' }]}>
              <Text style={[s.mono, { fontSize: 7, color: mission.done ? '#4ade80' : threat.color }]}>
                {mission.done ? 'COMPLETE' : threat.tag}
              </Text>
            </View>
          </View>

          {/* Name */}
          <Text style={[s.body, {
            fontSize: 14, fontWeight: '700', color: mission.done ? '#4ade8077' : '#e5e7eb',
            textDecorationLine: mission.done ? 'line-through' : 'none',
            marginBottom: 10, lineHeight: 18,
          }]}>{mission.text}</Text>

          {/* Progress bar */}
          {objTotal > 0 && (
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[s.mono, { fontSize: 7, color: '#4b5563', letterSpacing: 1 }]}>OBJECTIFS</Text>
                <Text style={[s.mono, { fontSize: 7, color: objDone === objTotal ? '#4ade80' : '#9ca3af' }]}>{objDone}/{objTotal}</Text>
              </View>
              <View style={{ height: 3, backgroundColor: '#1f2937', borderRadius: 1 }}>
                <Animated.View style={{ height: 3, width: barWidth, backgroundColor: '#4ade80', borderRadius: 1,
                  shadowColor: '#4ade80', shadowOpacity: 0.6, shadowRadius: 4 }} />
              </View>
            </View>
          )}

          <Text style={[s.body, { fontSize: 10, color: '#facc15', marginBottom: 10 }]}>+{threat.xp} XP</Text>

          {/* Actions */}
          {!mission.done ? (
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={() => onComplete(mission)} style={[s.btn, { borderColor: '#4ade8066', backgroundColor: '#052e1688', flex: 1 }]}>
                <Text style={[s.mono, { fontSize: 8, color: '#4ade80', letterSpacing: 1 }]}>▣ EXÉCUTER</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAdding(a => !a)} style={[s.btn, { borderColor: '#38bdf866' }]}>
                <Text style={[s.mono, { fontSize: 8, color: '#38bdf8' }]}>+ OBJ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(true)} style={[s.btn, { borderColor: '#38bdf844', paddingHorizontal: 10 }]}>
                <Text style={{ fontSize: 12, color: '#38bdf8' }}>✏</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={[s.btn, { borderColor: '#ef444444', paddingHorizontal: 10 }]}>
                <Text style={{ fontSize: 12, color: '#ef4444' }}>🗑</Text>
              </TouchableOpacity>
              {objTotal > 0 && (
                <TouchableOpacity onPress={() => setExpanded(e => !e)} style={[s.btn, { borderColor: '#37415166' }]}>
                  <Text style={[s.mono, { fontSize: 8, color: '#6b7280' }]}>{expanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity onPress={handleDelete} style={[s.btn, { borderColor: '#ef444433' }]}>
              <Text style={[s.mono, { fontSize: 8, color: '#ef444488', letterSpacing: 1 }]}>🗑 SUPPRIMER</Text>
            </TouchableOpacity>
          )}

          {/* Add objective form */}
          {adding && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                value={newText}
                onChangeText={setNewText}
                onSubmitEditing={handleAddObj}
                placeholder="Nouvel objectif..."
                placeholderTextColor="#4b5563"
                style={[s.input, { marginBottom: 8 }]}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                {['easy','medium','hard'].map(d => (
                  <TouchableOpacity key={d} onPress={() => setNewDiff(d)} style={{
                    flex: 1, paddingVertical: 5, alignItems: 'center',
                    backgroundColor: newDiff === d ? THREAT[d].color : '#1f2937',
                    borderRadius: 2,
                  }}>
                    <Text style={[s.mono, { fontSize: 8, color: newDiff === d ? '#000' : '#6b7280' }]}>{d.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={handleAddObj} style={[s.btn, { borderColor: color + '88', backgroundColor: color + '11' }]}>
                <Text style={[s.mono, { fontSize: 9, color, letterSpacing: 2 }]}>▣ CONFIRMER</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Objectives */}
        {expanded && mission.objectives?.length > 0 && (
          <View style={{ paddingLeft: 16, marginTop: 8 }}>
            <View style={{ width: 1, height: 8, backgroundColor: '#374151', alignSelf: 'flex-start', marginLeft: 12, marginBottom: 4 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: -4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                {mission.objectives.map(obj => (
                  <ObjectiveCard
                    key={obj.id} obj={obj}
                    onComplete={onComplete}
                    focusId={focusId} onFocus={onFocus}
                    color={color}
                    onDelete={(objId) => onDeleteObj(mission.id, objId)}
                    onEdit={(objId, text, diff) => onEditObj(mission.id, objId, text, diff)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </>
  );
}

// ── LOADOUT SCREEN ─────────────────────────────────────────────────────────
function LoadoutScreen({ onSelect }) {
  const [sel, setSel] = useState(null);
  const [callsign, setCallsign] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          {/* Header */}
          <Text style={[s.mono, { fontSize: 9, color: '#4ade80', letterSpacing: 6, textAlign: 'center', marginBottom: 4, opacity: 0.7 }]}>
            TASK FORCE // CLASSIFIED
          </Text>
          <Text style={[s.title, { fontSize: 44, color: '#e5e7eb', letterSpacing: 8, textAlign: 'center', lineHeight: 48 }]}>
            MISSION
          </Text>
          <Text style={[s.title, { fontSize: 44, color: '#4ade80', letterSpacing: 8, textAlign: 'center', lineHeight: 52,
            textShadowColor: '#4ade8066', textShadowRadius: 20 }]}>
            CONTROL
          </Text>

          <View style={{ height: 1, backgroundColor: '#4ade8033', marginVertical: 24, marginHorizontal: 40 }} />

          {/* Callsign */}
          <Text style={[s.mono, { fontSize: 9, color: '#4b5563', letterSpacing: 4, textAlign: 'center', marginBottom: 10 }]}>
            INDICATIF D'APPEL
          </Text>
          <TextInput
            value={callsign}
            onChangeText={t => setCallsign(t.toUpperCase())}
            placeholder="GHOST_01"
            placeholderTextColor="#374151"
            style={[s.input, { textAlign: 'center', fontSize: 18, letterSpacing: 6, marginBottom: 28, borderColor: '#374151' }]}
            autoCapitalize="characters"
          />

          {/* Classes */}
          <Text style={[s.mono, { fontSize: 9, color: '#4b5563', letterSpacing: 4, textAlign: 'center', marginBottom: 14 }]}>
            CLASSE OPÉRATIONNELLE
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
            {LOADOUTS.map((l, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSel(i)}
                style={{
                  width: (SW - 72) / 2,
                  padding: 16, alignItems: 'center',
                  backgroundColor: sel === i ? l.color + '11' : 'transparent',
                  borderWidth: 1, borderColor: sel === i ? l.color : '#1f2937',
                  shadowColor: sel === i ? l.color : 'transparent',
                  shadowOpacity: 0.4, shadowRadius: 10,
                }}
              >
                <Text style={{ fontSize: 30, marginBottom: 8 }}>{l.icon}</Text>
                <Text style={[s.title, { fontSize: 14, color: sel === i ? l.color : '#6b7280', letterSpacing: 3 }]}>{l.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => sel !== null && onSelect(sel, callsign)}
            disabled={sel === null}
            style={{
              borderWidth: 2,
              borderColor: sel !== null ? LOADOUTS[sel].color : '#374151',
              paddingVertical: 14, alignItems: 'center',
              shadowColor: sel !== null ? LOADOUTS[sel].color : 'transparent',
              shadowOpacity: 0.4, shadowRadius: 16,
            }}
          >
            <Text style={[s.title, {
              fontSize: 18, letterSpacing: 6,
              color: sel !== null ? LOADOUTS[sel].color : '#374151',
            }]}>
              {sel !== null ? '▶ DÉPLOYER' : 'CHOISIR UNE CLASSE'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('loadout');
  const [loadoutIdx, setLoadoutIdx] = useState(null);
  const [callsign, setCallsign] = useState('');
  const [xp, setXp] = useState(0);
  const [missions, setMissions] = useState(DEFAULT_MISSIONS);
  const [focusId, setFocusId] = useState(null);
  const [killfeeds, setKillfeeds] = useState([]);
  const [rankUp, setRankUp] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newMission, setNewMission] = useState({ text: '', diff: 'medium' });
  const [loaded, setLoaded] = useState(false);
  const feedId = useRef(0);

  const loadout = loadoutIdx !== null ? LOADOUTS[loadoutIdx] : LOADOUTS[0];

  // ── LOAD SAVE ──
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          const save = JSON.parse(raw);
          if (save.xp !== undefined) setXp(save.xp);
          if (save.missions) setMissions(save.missions);
          if (save.callsign) setCallsign(save.callsign);
          if (save.loadoutIdx !== null && save.loadoutIdx !== undefined) {
            setLoadoutIdx(save.loadoutIdx);
            setScreen('game');
          }
        }
      } catch (e) { console.log('Load error', e); }
      setLoaded(true);
    })();
  }, []);

  // ── AUTO SAVE ──
  useEffect(() => {
    if (!loaded) return;
    const save = async () => {
      try {
        await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({ xp, missions, callsign, loadoutIdx }));
      } catch (e) { console.log('Save error', e); }
    };
    save();
  }, [xp, missions, callsign, loadoutIdx, loaded]);

  const handleComplete = useCallback((item) => {
    const earned = THREAT[item.diff].xp;
    setXp(prev => {
      const newXp = prev + earned;
      const oldRank = getRank(prev);
      const newRank = getRank(newXp);
      if (newRank.level > oldRank.level) {
        setTimeout(() => setRankUp(newRank), 400);
      }
      return newXp;
    });

    const id = ++feedId.current;
    const feedItem = { id, xp: earned, color: THREAT[item.diff].color };
    setKillfeeds(prev => [...prev, feedItem]);
    setTimeout(() => setKillfeeds(prev => prev.filter(f => f.id !== id)), 2500);

    setMissions(prev => {
      const mark = list => list.map(m => {
        if (m.id === item.id) return { ...m, done: true };
        if (m.objectives) return { ...m, objectives: mark(m.objectives) };
        return m;
      });
      return mark(prev);
    });
  }, []);

  const handleDeleteMission = useCallback((missionId) => {
    setMissions(prev => prev.filter(m => m.id !== missionId));
    setFocusId(prev => prev === missionId ? null : prev);
  }, []);

  const handleEditMission = useCallback((missionId, text, diff) => {
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, text, diff } : m));
  }, []);

  const handleDeleteObj = useCallback((missionId, objId) => {
    setMissions(prev => prev.map(m =>
      m.id === missionId
        ? { ...m, objectives: m.objectives.filter(o => o.id !== objId) }
        : m
    ));
    setFocusId(prev => prev === objId ? null : prev);
  }, []);

  const handleEditObj = useCallback((missionId, objId, text, diff) => {
    setMissions(prev => prev.map(m =>
      m.id === missionId
        ? { ...m, objectives: m.objectives.map(o => o.id === objId ? { ...o, text, diff } : o) }
        : m
    ));
  }, []);

  const handleAddObj = useCallback((parentId, text, diff) => {
    setMissions(prev => prev.map(m =>
      m.id === parentId
        ? { ...m, objectives: [...(m.objectives || []), { id: `${parentId}-${Date.now()}`, text, diff, done: false }] }
        : m
    ));
  }, []);

  const handleAddMission = () => {
    if (!newMission.text.trim()) return;
    const code = `OP-${OP_CODES[Math.floor(Math.random() * OP_CODES.length)]}`;
    setMissions(prev => [...prev, {
      id: `m${Date.now()}`, code, text: newMission.text.trim(),
      diff: newMission.diff, done: false, objectives: [],
    }]);
    setNewMission({ text: '', diff: 'medium' });
    setShowAdd(false);
  };

  const handleReset = () => {
    Alert.alert('Réinitialiser ?', 'Toutes les missions et la progression seront perdues.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem(SAVE_KEY);
        setXp(0); setMissions(DEFAULT_MISSIONS); setFocusId(null);
      }},
    ]);
  };

  const rank = getRank(xp);
  const done = missions.filter(m => m.done).length + missions.flatMap(m => m.objectives || []).filter(o => o.done).length;
  const total = missions.length + missions.flatMap(m => m.objectives || []).length;
  const focusedItem = focusId ? [...missions, ...missions.flatMap(m => m.objectives || [])].find(x => x.id === focusId) : null;

  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (screen === 'loadout') {
    return <LoadoutScreen onSelect={(idx, cs) => {
      setLoadoutIdx(idx); setCallsign(cs || 'GHOST'); setScreen('game');
    }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Kill feeds */}
      <KillFeed items={killfeeds} />

      {/* Rank up */}
      {rankUp && <RankUpOverlay rank={rankUp} onDone={() => setRankUp(null)} />}

      <SafeAreaView style={{ flex: 1 }}>
        {/* HUD */}
        <View style={[s.hud, { borderBottomColor: loadout.color + '33' }]}>
          <TouchableOpacity onPress={() => setScreen('loadout')} style={{ marginRight: 10 }}>
            <Text style={[s.mono, { fontSize: 7, color: '#4ade8066', letterSpacing: 3, lineHeight: 12 }]}>
              MISSION{'\n'}CONTROL
            </Text>
          </TouchableOpacity>

          <View style={{ marginRight: 12 }}>
            <Text style={[s.title, { fontSize: 13, color: loadout.color, letterSpacing: 2 }]}>
              {callsign.toUpperCase() || 'GHOST'}
            </Text>
            <Text style={[s.mono, { fontSize: 7, color: '#4b5563', letterSpacing: 1 }]}>
              {rank.insignia} {rank.title}
            </Text>
          </View>

          <XPBar xp={xp} color={loadout.color} />

          <View style={{ flexDirection: 'row', gap: 14, marginLeft: 10 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.title, { fontSize: 18, color: '#4ade80', lineHeight: 22 }]}>{done}</Text>
              <Text style={[s.mono, { fontSize: 6, color: '#374151' }]}>FAITS</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.title, { fontSize: 18, color: '#4b5563', lineHeight: 22 }]}>{total - done}</Text>
              <Text style={[s.mono, { fontSize: 6, color: '#374151' }]}>RESTANTS</Text>
            </View>
          </View>
        </View>

        {/* Focus bar */}
        {focusedItem && !focusedItem.done && (
          <View style={[s.focusBar, { borderBottomColor: loadout.color + '33', borderLeftColor: loadout.color }]}>
            <Text style={[s.mono, { fontSize: 8, color: '#4b5563', letterSpacing: 3 }]}>◈ ACTIF</Text>
            <Text style={[s.body, { fontSize: 11, color: loadout.color, flex: 1, marginHorizontal: 8 }]} numberOfLines={1}>
              {focusedItem.text?.toUpperCase()}
            </Text>
            <Text style={[s.mono, { fontSize: 9, color: '#facc15', marginRight: 8 }]}>+{THREAT[focusedItem.diff]?.xp} XP</Text>
            <TouchableOpacity onPress={() => setFocusId(null)}>
              <Text style={[s.mono, { fontSize: 9, color: loadout.color }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mission list */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {missions.map(m => (
            <MissionCard
              key={m.id} mission={m}
              onComplete={handleComplete}
              onAddObj={handleAddObj}
              onDelete={handleDeleteMission}
              onEdit={handleEditMission}
              onDeleteObj={handleDeleteObj}
              onEditObj={handleEditObj}
              focusId={focusId}
              onFocus={id => setFocusId(prev => prev === id ? null : id)}
              color={loadout.color}
            />
          ))}

          {/* Add mission */}
          {!showAdd ? (
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              style={[s.card, { borderStyle: 'dashed', borderColor: '#1f2937', alignItems: 'center', paddingVertical: 20 }]}
            >
              <Text style={[s.title, { fontSize: 24, color: '#374151' }]}>+</Text>
              <Text style={[s.mono, { fontSize: 9, color: '#374151', letterSpacing: 4, marginTop: 4 }]}>NOUVELLE MISSION</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.card, { borderColor: loadout.color }]}>
              <TextInput
                value={newMission.text}
                onChangeText={t => setNewMission(prev => ({ ...prev, text: t }))}
                onSubmitEditing={handleAddMission}
                placeholder="Nom de la mission..."
                placeholderTextColor="#4b5563"
                style={[s.input, { marginBottom: 10 }]}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {['easy','medium','hard'].map(d => (
                  <TouchableOpacity key={d} onPress={() => setNewMission(prev => ({ ...prev, diff: d }))} style={{
                    flex: 1, paddingVertical: 6, alignItems: 'center',
                    backgroundColor: newMission.diff === d ? THREAT[d].color : '#111',
                    borderRadius: 2,
                  }}>
                    <Text style={[s.mono, { fontSize: 8, color: newMission.diff === d ? '#000' : '#6b7280' }]}>
                      {d.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={handleAddMission} style={[s.btn, { flex: 1, borderColor: loadout.color + '88', backgroundColor: loadout.color + '11' }]}>
                  <Text style={[s.mono, { fontSize: 9, color: loadout.color, letterSpacing: 2 }]}>▣ DÉPLOYER</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAdd(false)} style={[s.btn, { borderColor: '#374151' }]}>
                  <Text style={[s.mono, { fontSize: 9, color: '#6b7280' }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reset */}
          <TouchableOpacity onPress={handleReset} style={{ alignItems: 'center', paddingVertical: 20, marginTop: 8 }}>
            <Text style={[s.mono, { fontSize: 8, color: '#374151', letterSpacing: 3 }]}>⚑ RÉINITIALISER</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── STYLES ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  title: {
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Heavy' : 'sans-serif-condensed',
    fontWeight: '900',
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '700',
  },
  body: {
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif-medium',
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0a0a0aee',
    padding: 14,
    marginBottom: 12,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  btn: {
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 10,
    color: '#e5e7eb',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    borderRadius: 2,
    letterSpacing: 1,
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    backgroundColor: '#000000f0',
  },
  focusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    backgroundColor: '#050f0599',
  },
});
