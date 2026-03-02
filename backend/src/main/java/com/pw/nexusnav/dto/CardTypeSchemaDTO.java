package com.pw.nexusnav.dto;

import java.util.ArrayList;
import java.util.List;

public class CardTypeSchemaDTO {

    private String type;
    private String name;
    private String description;
    private boolean healthCheckSupported;
    private String defaultOpenMode;
    private List<FieldSchemaDTO> fields = new ArrayList<>();

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isHealthCheckSupported() {
        return healthCheckSupported;
    }

    public void setHealthCheckSupported(boolean healthCheckSupported) {
        this.healthCheckSupported = healthCheckSupported;
    }

    public String getDefaultOpenMode() {
        return defaultOpenMode;
    }

    public void setDefaultOpenMode(String defaultOpenMode) {
        this.defaultOpenMode = defaultOpenMode;
    }

    public List<FieldSchemaDTO> getFields() {
        return fields;
    }

    public void setFields(List<FieldSchemaDTO> fields) {
        this.fields = fields;
    }

    public static class FieldSchemaDTO {
        private String key;
        private String label;
        private String type;
        private boolean required;
        private boolean secret;
        private String placeholder;
        private Object defaultValue;
        private Integer min;
        private Integer max;
        private List<FieldOptionDTO> options = new ArrayList<>();

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public boolean isRequired() {
            return required;
        }

        public void setRequired(boolean required) {
            this.required = required;
        }

        public boolean isSecret() {
            return secret;
        }

        public void setSecret(boolean secret) {
            this.secret = secret;
        }

        public String getPlaceholder() {
            return placeholder;
        }

        public void setPlaceholder(String placeholder) {
            this.placeholder = placeholder;
        }

        public Object getDefaultValue() {
            return defaultValue;
        }

        public void setDefaultValue(Object defaultValue) {
            this.defaultValue = defaultValue;
        }

        public Integer getMin() {
            return min;
        }

        public void setMin(Integer min) {
            this.min = min;
        }

        public Integer getMax() {
            return max;
        }

        public void setMax(Integer max) {
            this.max = max;
        }

        public List<FieldOptionDTO> getOptions() {
            return options;
        }

        public void setOptions(List<FieldOptionDTO> options) {
            this.options = options;
        }
    }

    public static class FieldOptionDTO {
        private String label;
        private String value;

        public FieldOptionDTO() {
        }

        public FieldOptionDTO(String label, String value) {
            this.label = label;
            this.value = value;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }
    }
}
