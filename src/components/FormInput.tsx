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
import { colors } from '../styles/common';

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
    const borderColor = error ? '#FF5252' : colors.oceanSurface;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            { borderColor },
            inputStyle,
          ]}
          placeholderTextColor={colors.textSecondary}
          {...rest}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

FormInput.displayName = 'FormInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.oceanSurface,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: 13,
    color: '#FF5252',
    marginTop: 4,
  },
});

export default FormInput;
