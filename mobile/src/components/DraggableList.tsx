/* eslint-disable react-hooks/refs --
   Drag gestures run outside React's render: the responders and the animated values live in refs on purpose, and they
   are only read from gesture callbacks and effects. The rule cannot see that through the helper functions. */
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, View } from "react-native";

/** Dragging with a mouse (the web build) would otherwise highlight the text under the pointer. */
const noSelect = { userSelect: "none" } as object;

export type DragHandleProps = ReturnType<typeof PanResponder.create>["panHandlers"];

type Props<T> = {
  data: T[];
  keyOf: (item: T) => string;
  /** Every row has the same height, which is what makes dragging cheap and exact. */
  rowHeight: number;
  gap?: number;
  renderItem: (item: T, state: { dragging: boolean; handle: DragHandleProps }) => ReactNode;
  /** Called once, when a drag ends on a new position. */
  onReorder: (next: T[]) => void;
  /** So the screen can stop scrolling while a row is being dragged. */
  onDragChange?: (dragging: boolean) => void;
};

/**
 * A list you reorder by holding a row's handle and dragging it. The other rows slide out of the way as you go.
 * The handle is the only part that starts a drag, so scrolling and tapping the rest of a row still work.
 */
export function DraggableList<T>({ data, keyOf, rowHeight, gap = 10, renderItem, onReorder, onDragChange }: Props<T>) {
  const step = rowHeight + gap;
  const keys = data.map(keyOf);
  const [order, setOrder] = useState(keys);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const tops = useRef(new Map<string, Animated.Value>()).current;
  const dragTop = useRef(new Animated.Value(0)).current;
  const live = useRef({ key: null as string | null, start: 0, index: 0, order: keys });

  // New data from outside (a reload) replaces the order, except in the middle of a drag.
  const signature = keys.join("|");
  useEffect(() => {
    if (live.current.key) return;
    const next = signature ? signature.split("|") : [];
    live.current.order = next;
    setOrder(next);
  }, [signature]);

  const topOf = (key: string, index: number) => {
    let v = tops.get(key);
    if (!v) {
      v = new Animated.Value(index * step);
      tops.set(key, v);
    }
    return v;
  };

  // Every row that is not being dragged slides to its place.
  useEffect(() => {
    order.forEach((key, index) => {
      if (key === live.current.key) return;
      Animated.timing(topOf(key, index), { toValue: index * step, duration: 140, useNativeDriver: false }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, step]);

  const byKey = useMemo(() => new Map(data.map((d) => [keyOf(d), d])), [data, keyOf]);
  const last = Math.max(order.length - 1, 0);

  // The handlers must stay the same object for the whole drag: a gesture is tracked by the responder that started it.
  // They read everything that can change from `latest`, which is refreshed on every render.
  const latest = useRef({ step, last, signature, byKey, onReorder, onDragChange });
  useEffect(() => {
    latest.current = { step, last, signature, byKey, onReorder, onDragChange };
  });

  const buildHandle = (key: string): DragHandleProps => {
    const finish = () => {
      const { order: finalOrder, index } = live.current;
      const { step: st } = latest.current;
      Animated.timing(dragTop, { toValue: index * st, duration: 120, useNativeDriver: false }).start(() => {
        tops.get(key)?.setValue(index * st);
        live.current.key = null;
        setDragKey(null);
        const l = latest.current;
        l.onDragChange?.(false);
        if (finalOrder.join("|") !== l.signature) l.onReorder(finalOrder.map((k) => l.byKey.get(k)!).filter(Boolean));
      });
    };
    const handlers = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Once a drag has started, nothing may take it away (a ScrollView would otherwise steal it).
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const { step: st, onDragChange: change } = latest.current;
        const index = live.current.order.indexOf(key);
        live.current = { ...live.current, key, start: index * st, index };
        dragTop.setValue(index * st);
        setDragKey(key);
        change?.(true);
      },
      onPanResponderMove: (_e, g) => {
        const { step: st, last: end } = latest.current;
        const top = Math.min(Math.max(live.current.start + g.dy, 0), end * st);
        dragTop.setValue(top);
        const target = Math.round(top / st);
        if (target !== live.current.index) {
          const next = live.current.order.filter((k) => k !== key);
          next.splice(target, 0, key);
          live.current.order = next;
          live.current.index = target;
          setOrder(next);
        }
      },
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    }).panHandlers;
    return handlers;
  };
  // Built again only when the set of rows changes, never in the middle of a drag.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handles = useMemo(() => new Map(signature ? signature.split("|").map((k) => [k, buildHandle(k)] as const) : []), [signature]);

  return (
    <View style={[{ height: Math.max(order.length * step - gap, 0) }, noSelect]}>
      {order.map((key, index) => {
        const item = byKey.get(key);
        if (!item) return null;
        const dragging = key === dragKey;
        return (
          <Animated.View key={key} style={{ position: "absolute", left: 0, right: 0, height: rowHeight, top: dragging ? dragTop : topOf(key, index), zIndex: dragging ? 10 : 0, opacity: dragging ? 0.92 : 1 }}>
            {renderItem(item, { dragging, handle: handles.get(key) as DragHandleProps })}
          </Animated.View>
        );
      })}
    </View>
  );
}
