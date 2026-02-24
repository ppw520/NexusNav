package com.pw.nexusnav.dto;

public record CardDTO(
        String id,
        String groupId,
        String name,
        String url,
        String lanUrl,
        String wanUrl,
        String openMode,
        String icon,
        String description,
        int orderIndex,
        boolean enabled,
        boolean healthCheckEnabled
) {
}
