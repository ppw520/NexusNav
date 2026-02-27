package com.pw.nexusnav.dto;

import java.util.ArrayList;
import java.util.List;

public class ImportNavConfigRequest {

    private List<GroupItem> groups = new ArrayList<>();
    private List<CardItem> cards = new ArrayList<>();

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
        private String cardType;
        private String sshHost;
        private Integer sshPort;
        private String sshUsername;
        private String sshAuthMode;
        private String embyApiKey;
        private String icon;
        private String description;
        private int orderIndex;
        private boolean enabled = true;
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

        public String getEmbyApiKey() {
            return embyApiKey;
        }

        public void setEmbyApiKey(String embyApiKey) {
            this.embyApiKey = embyApiKey;
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
}
