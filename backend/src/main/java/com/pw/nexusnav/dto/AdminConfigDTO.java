package com.pw.nexusnav.dto;

import java.util.ArrayList;
import java.util.List;

public class AdminConfigDTO {

    private String networkModePreference;
    private String defaultSearchEngineId;
    private List<SearchEngineItemDTO> searchEngines = new ArrayList<>();
    private SecurityDTO security;

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

    public List<SearchEngineItemDTO> getSearchEngines() {
        return searchEngines;
    }

    public void setSearchEngines(List<SearchEngineItemDTO> searchEngines) {
        this.searchEngines = searchEngines;
    }

    public SecurityDTO getSecurity() {
        return security;
    }

    public void setSecurity(SecurityDTO security) {
        this.security = security;
    }

    public static class SearchEngineItemDTO {
        private String id;
        private String name;
        private String searchUrlTemplate;

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
    }

    public static class SecurityDTO {
        private boolean enabled;
        private int sessionTimeoutMinutes;

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
    }
}
