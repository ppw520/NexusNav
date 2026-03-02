package com.pw.nexusnav.dto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
        private String cardType;
        private String openMode;
        private String icon;
        private String description;
        private int orderIndex;
        private boolean enabled = true;
        private boolean healthCheckEnabled = true;
        private Map<String, Object> config = new LinkedHashMap<>();
        private LinkedHashMap<String, String> secretRefs = new LinkedHashMap<>();

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

        public String getCardType() {
            return cardType;
        }

        public void setCardType(String cardType) {
            this.cardType = cardType;
        }

        public String getOpenMode() {
            return openMode;
        }

        public void setOpenMode(String openMode) {
            this.openMode = openMode;
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

        public Map<String, Object> getConfig() {
            return config;
        }

        public void setConfig(Map<String, Object> config) {
            this.config = config;
        }

        public LinkedHashMap<String, String> getSecretRefs() {
            return secretRefs;
        }

        public void setSecretRefs(LinkedHashMap<String, String> secretRefs) {
            this.secretRefs = secretRefs;
        }
    }
}
