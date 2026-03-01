package com.pw.nexusnav.dto;

public record CardDTO(
        String id,
        String groupId,
        String name,
        String url,
        String lanUrl,
        String wanUrl,
        String openMode,
        String cardType,
        String sshHost,
        Integer sshPort,
        String sshUsername,
        String sshAuthMode,
        String qbittorrentUsername,
        String transmissionUsername,
        boolean hasEmbyApiKey,
        boolean hasQbittorrentPassword,
        boolean hasTransmissionPassword,
        String icon,
        String description,
        int orderIndex,
        boolean enabled,
        boolean healthCheckEnabled
) {
}
