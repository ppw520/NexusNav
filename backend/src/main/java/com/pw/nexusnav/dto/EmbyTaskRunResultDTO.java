package com.pw.nexusnav.dto;

public record EmbyTaskRunResultDTO(
        String taskId,
        String taskName,
        boolean triggered,
        String status,
        String message,
        long updatedAt,
        String source
) {
}
