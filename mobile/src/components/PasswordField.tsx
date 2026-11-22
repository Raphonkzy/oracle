import { useState } from "react";
import { Pressable, View } from "react-native";
import { t } from "@/i18n";
import { colors } from "@/theme";
import { Icon } from "./Icon";
import { Field } from "./ui";

/** A password box with an eye to show or hide what was typed. */
export function PasswordField({ label, value, onChangeText, mode, onSubmitEditing, returnKeyType }: { label: string; value: string; onChangeText: (v: string) => void; mode: "current" | "new"; onSubmitEditing?: () => void; returnKeyType?: "go" | "next" | "done" }) {
  const [shown, setShown] = useState(false);
  return (
    <View>
      <Field
        label={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={mode === "current" ? "current-password" : "new-password"}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        style={{ paddingRight: 52 }}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={shown ? t("Hide password") : t("Show password")} onPress={() => setShown((v) => !v)} hitSlop={8} style={{ position: "absolute", right: 14, bottom: 13 }}>
        <Icon name={shown ? "eyeoff" : "eye"} color={colors.mute} size={22} />
      </Pressable>
    </View>
  );
}
