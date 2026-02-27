package com.pw.nexusnav.dto;

public record TorrentStatusBreakdownDTO(
        int downloading,
        int seeding,
        int paused,
        int queued,
        int checking,
        int stalled,
        int error,
        int unknown
) {
}
