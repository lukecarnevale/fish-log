import React from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  Text,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Theme } from '../styles/theme';

/**
 * FormInput Component
 *
 * A presentational input component with optional label and error state.
 * Handles styling based on validation status but delegates validation logic to parent.
 *
 * @example
 * ```tsx
 * const [name, setName] = React.useState('');
 * const [error, setError] = React.useState('');
 *
 * const handleChange = (value: string) => {
 *   setName(value);
 *   // Parent handles validation
 *   if (value.length === 0) {
 *     setError('Name is required');
 *   } else {
 *     setError('');
 *   }
 * };
 *
 * <FormInput
 *   label="Full Name"
 *   placeholder="Enter your name"
 *   value={name}
 *   onChangeText={handleChange}
 *   error={error}
 * />
 * ```
 */

export interface FormInputProps extends TextInputProps {
  /** Label text displayed above the input */
  label?: string;
  /** Error message - when present, shows red border and error text */
  error?: string;
  /** Style for the outer container */
  containerStyle?: ViewStyle;
  /** Style for the TextInput element */
  inputStyle?: TextStyle;
  /** Style for the label text */
  labelStyle?: TextStyle;
}

export const FormInput = React.forwardRef<TextInput, FormInputProps>(
  (
    {
      label,
      error,
      containerStyle,
      inputStyle,
      labelStyle,
      ...rest
    },
    ref
  ) => {
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);
    const borderColor = error ? theme.colors.error : theme.colors.oceanSurface;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text
            style={[styles.label, labelStyle]}
            maxFontSizeMultiplier={1.3}
          >
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            { borderColor },
            inputStyle,
          ]}
          placeholderTextColor={theme.colors.textSecondary}
          maxFontSizeMultiplier={1.3}
          {...rest}
        />
        {error && (
          <Text
            style={styles.errorText}
            maxFontSizeMultiplier={1.3}
            numberOfLines={3}
          >
            {error}
          </Text>
        )}
      </View>
    );
  }
);

FormInput.displayName = 'FormInput';

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.oceanSurface,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 16,
    color: theme.colors.textPrimary,
    textAlignVertical: 'center',
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    marginTop: 4,
  },
});

export default FormInput;
