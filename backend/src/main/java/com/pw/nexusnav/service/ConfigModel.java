package com.pw.nexusnav.service;

import java.util.ArrayList;
import java.util.List;

public class ConfigModel {

    public static final String NETWORK_MODE_AUTO = "auto";
    public static final String NETWORK_MODE_LAN = "lan";
    public static final String NETWORK_MODE_WAN = "wan";
    public static final String CARD_TYPE_GENERIC = "generic";
    public static final String CARD_TYPE_SSH = "ssh";
    public static final String SSH_AUTH_PASSWORD = "password";
    public static final String SSH_AUTH_PRIVATE_KEY = "privatekey";

    public static class NavModel {
        private String version;
        private List<GroupItem> groups = new ArrayList<>();
        private List<CardItem> cards = new ArrayList<>();

        public String getVersion() {
            return version;
        }

        public void setVersion(String version) {
            this.version = version;
        }

        public List<GroupItem> getGroups() {
            return groups;
        }

        public void setGroups(List<GroupItem> groups) {
            this.groups = groups;
        }

        public List<CardItem> getCards() {
            return cards;
        }

        public void setCards(List<CardItem> cards) {
            this.cards = cards;
        }
    }

    public static class SystemModel {
        private String adminPassword = "";
        private String defaultSearchEngineId = "bing";
        private String networkModePreference = NETWORK_MODE_AUTO;
        private boolean dailySentenceEnabled = true;
        private String backgroundType = "gradient";
        private String backgroundImageDataUrl;
        private List<SearchEngineItem> searchEngines = new ArrayList<>();
        private SecurityModel security = new SecurityModel();

        public String getAdminPassword() {
            return adminPassword;
        }

        public void setAdminPassword(String adminPassword) {
            this.adminPassword = adminPassword;
        }

        public String getDefaultSearchEngineId() {
            return defaultSearchEngineId;
        }

        public void setDefaultSearchEngineId(String defaultSearchEngineId) {
            this.defaultSearchEngineId = defaultSearchEngineId;
        }

        public String getNetworkModePreference() {
            return networkModePreference;
        }

        public void setNetworkModePreference(String networkModePreference) {
            this.networkModePreference = networkModePreference;
        }

        public boolean isDailySentenceEnabled() {
            return dailySentenceEnabled;
        }

        public void setDailySentenceEnabled(boolean dailySentenceEnabled) {
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

        public List<SearchEngineItem> getSearchEngines() {
            return searchEngines;
        }

        public void setSearchEngines(List<SearchEngineItem> searchEngines) {
            this.searchEngines = searchEngines;
        }

        public SecurityModel getSecurity() {
            return security;
        }

        public void setSecurity(SecurityModel security) {
            this.security = security;
        }
    }

    public static class GroupItem {
        private String id;
        private String name;
        private int orderIndex;

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

        public int getOrderIndex() {
            return orderIndex;
        }

        public void setOrderIndex(int orderIndex) {
            this.orderIndex = orderIndex;
        }
    }

    public static class CardItem {
        private String id;
        private String groupId;
        private String name;
        private String url;
        private String lanUrl;
        private String wanUrl;
        private String openMode;
        private String cardType = CARD_TYPE_GENERIC;
        private String sshHost;
        private Integer sshPort;
        private String sshUsername;
        private String sshAuthMode = SSH_AUTH_PASSWORD;
        private String icon;
        private String description;
        private int orderIndex;
        private boolean enabled;
        private boolean healthCheckEnabled = true;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getGroupId() {
            return groupId;
        }

        public void setGroupId(String groupId) {
            this.groupId = groupId;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getLanUrl() {
            return lanUrl;
        }

        public void setLanUrl(String lanUrl) {
            this.lanUrl = lanUrl;
        }

        public String getWanUrl() {
            return wanUrl;
        }

        public void setWanUrl(String wanUrl) {
            this.wanUrl = wanUrl;
        }

        public String getOpenMode() {
            return openMode;
        }

        public void setOpenMode(String openMode) {
            this.openMode = openMode;
        }

        public String getCardType() {
            return cardType;
        }

        public void setCardType(String cardType) {
            this.cardType = cardType;
        }

        public String getSshHost() {
            return sshHost;
        }

        public void setSshHost(String sshHost) {
            this.sshHost = sshHost;
        }

        public Integer getSshPort() {
            return sshPort;
        }

        public void setSshPort(Integer sshPort) {
            this.sshPort = sshPort;
        }

        public String getSshUsername() {
            return sshUsername;
        }

        public void setSshUsername(String sshUsername) {
            this.sshUsername = sshUsername;
        }

        public String getSshAuthMode() {
            return sshAuthMode;
        }

        public void setSshAuthMode(String sshAuthMode) {
            this.sshAuthMode = sshAuthMode;
        }

        public String getIcon() {
            return icon;
        }

        public void setIcon(String icon) {
            this.icon = icon;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public int getOrderIndex() {
            return orderIndex;
        }

        public void setOrderIndex(int orderIndex) {
            this.orderIndex = orderIndex;
        }

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public boolean isHealthCheckEnabled() {
            return healthCheckEnabled;
        }

        public void setHealthCheckEnabled(boolean healthCheckEnabled) {
            this.healthCheckEnabled = healthCheckEnabled;
        }
    }

    public static class SearchEngineItem {
        private String id;
        private String name;
        private String searchUrlTemplate;
        private String lanUrl;
        private String wanUrl;
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

        public String getLanUrl() {
            return lanUrl;
        }

        public void setLanUrl(String lanUrl) {
            this.lanUrl = lanUrl;
        }

        public String getWanUrl() {
            return wanUrl;
        }

        public void setWanUrl(String wanUrl) {
            this.wanUrl = wanUrl;
        }

        public String getIcon() {
            return icon;
        }

        public void setIcon(String icon) {
            this.icon = icon;
        }
    }

    public static class SecurityModel {
        private boolean enabled = true;
        private int sessionTimeoutMinutes = 480;
        private boolean requireAuthForConfig;

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

        public boolean isRequireAuthForConfig() {
            return requireAuthForConfig;
        }

        public void setRequireAuthForConfig(boolean requireAuthForConfig) {
            this.requireAuthForConfig = requireAuthForConfig;
        }
    }
}
