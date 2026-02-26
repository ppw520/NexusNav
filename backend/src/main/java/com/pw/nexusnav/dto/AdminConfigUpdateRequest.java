package com.pw.nexusnav.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

public class AdminConfigUpdateRequest {

    @NotBlank
    @Pattern(regexp = "^(auto|lan|wan)$")
    private String networkModePreference;

    @NotBlank
    @Size(max = 64)
    private String defaultSearchEngineId;

    private Boolean dailySentenceEnabled;

    @NotBlank
    @Pattern(regexp = "^(gradient|image)$")
    private String backgroundType;

    private String backgroundImageDataUrl;

    @NotNull
    @Valid
    private List<SearchEngineItemRequest> searchEngines = new ArrayList<>();

    @NotNull
    @Valid
    private SecurityRequest security;

    @Size(min = 8, max = 128)
    private String newAdminPassword;

    public String getNetworkModePreference() {
        return networkModePreference;
    }

    public void setNetworkModePreference(String networkModePreference) {
        this.networkModePreference = networkModePreference;
    }

    public String getDefaultSearchEngineId() {
        return defaultSearchEngineId;
    }

    public void setDefaultSearchEngineId(String defaultSearchEngineId) {
        this.defaultSearchEngineId = defaultSearchEngineId;
    }

    public Boolean getDailySentenceEnabled() {
        return dailySentenceEnabled;
    }

    public void setDailySentenceEnabled(Boolean dailySentenceEnabled) {
        this.dailySentenceEnabled = dailySentenceEnabled;
    }

    public String getBackgroundType() {
        return backgroundType;
    }

    public void setBackgroundType(String backgroundType) {
        this.backgroundType = backgroundType;
    }

    public String getBackgroundImageDataUrl() {
        return backgroundImageDataUrl;
    }

    public void setBackgroundImageDataUrl(String backgroundImageDataUrl) {
        this.backgroundImageDataUrl = backgroundImageDataUrl;
    }

    public List<SearchEngineItemRequest> getSearchEngines() {
        return searchEngines;
    }

    public void setSearchEngines(List<SearchEngineItemRequest> searchEngines) {
        this.searchEngines = searchEngines;
    }

    public SecurityRequest getSecurity() {
        return security;
    }

    public void setSecurity(SecurityRequest security) {
        this.security = security;
    }

    public String getNewAdminPassword() {
        return newAdminPassword;
    }

    public void setNewAdminPassword(String newAdminPassword) {
        this.newAdminPassword = newAdminPassword;
    }

    public static class SearchEngineItemRequest {
        @NotBlank
        @Size(max = 64)
        private String id;

        @NotBlank
        @Size(max = 128)
        private String name;

        @NotBlank
        @Size(max = 2048)
        private String searchUrlTemplate;

        @Size(max = 2048)
        private String icon;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getSearchUrlTemplate() {
            return searchUrlTemplate;
        }

        public void setSearchUrlTemplate(String searchUrlTemplate) {
            this.searchUrlTemplate = searchUrlTemplate;
        }

        public String getIcon() {
            return icon;
        }

        public void setIcon(String icon) {
            this.icon = icon;
        }
    }

    public static class SecurityRequest {
        private boolean enabled;
        private int sessionTimeoutMinutes;
        private Boolean requireAuthForConfig;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getSessionTimeoutMinutes() {
            return sessionTimeoutMinutes;
        }

        public void setSessionTimeoutMinutes(int sessionTimeoutMinutes) {
            this.sessionTimeoutMinutes = sessionTimeoutMinutes;
        }

        public Boolean getRequireAuthForConfig() {
            return requireAuthForConfig;
        }

        public void setRequireAuthForConfig(Boolean requireAuthForConfig) {
            this.requireAuthForConfig = requireAuthForConfig;
        }
    }
}
