import { type Category, type CategoryKind, isFeeCategory } from "@oracle/core";
import { useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import { t } from "@/i18n";
import { errorMessage } from "@/lib/hooks";
import { colors } from "@/theme";
import { Sheet } from "./Calendar";
import { confirmDialog } from "./ConfirmHost";
import { IconPicker } from "./IconPicker";
import { Button, Field, T } from "./ui";

/**
 * Add a category (no `category`), or rename, re-icon or hide one. The form restarts every time the sheet opens,
 * because the parent mounts it only while it is open.
 */
export function CategorySheet({ kind, category, onClose, onSaved }: { kind: CategoryKind; category?: Category; onClose: () => void; onSaved: (c: Category | null) => void }) {
  const locked = category?.kind === "expense" && isFeeCategory(category.name);
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "tag");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!locked && !trimmed) return setError(t("Give the category a name."));
    setBusy(true);
    setError(null);
    try {
      if (category) {
        const res = await api.patch<{ category: Category }>(`/categories/${category.id}`, { ...(locked ? {} : { name: trimmed }), icon });
        onSaved(res.category);
      } else {
        const res = await api.post<{ category: Category }>("/categories", { name: trimmed, kind, icon });
        onSaved(res.category);
      }
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function hide() {
    if (!category) return;
    setBusy(true);
    try {
      await api.post(`/categories/${category.id}/archive`);
      onSaved(null);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function confirmHide() {
    if (await confirmDialog({ title: t("Hide this category?"), message: t("Past transactions keep it. Its budgets are removed."), confirmLabel: t("Hide"), destructive: true })) void hide();
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      title={category ? t("Edit category") : kind === "expense" ? t("New expense category") : t("New income category")}
      top={
        locked ? (
          <T kind="mute">{t("This category is used for transfer fees, so its name stays. You can still change the icon.")}</T>
        ) : (
          <Field label={t("Name")} value={name} onChangeText={setName} maxLength={40} placeholder={kind === "expense" ? t("Coffee, Pets, Rent...") : t("Side job, Dividends...")} autoFocus={!category} />
        )
      }
      footer={
        <View style={{ gap: 12, paddingTop: 12 }}>
          {error ? <T kind="body" style={{ color: colors.danger }} accessibilityRole="alert">{error}</T> : null}
          <Button label={category ? t("Save") : t("Add category")} onPress={save} busy={busy} />
          {category && !locked ? <Button label={t("Hide category")} tone="danger" onPress={confirmHide} disabled={busy} /> : null}
        </View>
      }
    >
      <T kind="label">{t("Icon")}</T>
      <IconPicker value={icon} onChange={setIcon} />
    </Sheet>
  );
}
