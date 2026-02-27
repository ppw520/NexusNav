package com.pw.nexusnav.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UpdateCardRequest {

    @NotBlank
    @Size(max = 64)
    private String groupId;

    @NotBlank
    @Size(max = 128)
    private String name;

    @Size(max = 2048)
    private String url;

    @Size(max = 2048)
    private String lanUrl;

    @Size(max = 2048)
    private String wanUrl;

    @NotBlank
    @Pattern(regexp = "^(iframe|newtab|auto)$")
    private String openMode;

    @Pattern(regexp = "^(generic|ssh)$")
    private String cardType;

    @Size(max = 255)
    private String sshHost;

    private Integer sshPort;

    @Size(max = 128)
    private String sshUsername;

    @Pattern(regexp = "^(password|privatekey)$")
    private String sshAuthMode;

    @Size(max = 128)
    private String icon;

    @Size(max = 512)
    private String description;

    private int orderIndex;

    private boolean enabled = true;
    private boolean healthCheckEnabled = true;

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
