package com.pw.nexusnav.dto;

public record EmbyTaskDTO(
        String id,
        String name,
        String description,
        String module,
        String state,
        boolean isRunning,
        String lastRunAt,
        String lastResult
) {
}
