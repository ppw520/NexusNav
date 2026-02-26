package com.pw.nexusnav.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "cards")
public class CardEntity {

    @Id
    @Column(nullable = false, length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private GroupEntity group;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(name = "lan_url", length = 2048)
    private String lanUrl;

    @Column(name = "wan_url", length = 2048)
    private String wanUrl;

    @Column(name = "open_mode", nullable = false, length = 32)
    private String openMode;

    @Column(name = "card_type", nullable = false, length = 32)
    private String cardType = "generic";

    @Column(name = "ssh_host", length = 255)
    private String sshHost;

    @Column(name = "ssh_port")
    private Integer sshPort;

    @Column(name = "ssh_username", length = 128)
    private String sshUsername;

    @Column(name = "ssh_auth_mode", length = 32)
    private String sshAuthMode;

    @Column(length = 128)
    private String icon;

    @Column(length = 512)
    private String description;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "health_check_enabled", nullable = false)
    private boolean healthCheckEnabled = true;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public GroupEntity getGroup() {
        return group;
    }

    public void setGroup(GroupEntity group) {
        this.group = group;
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
