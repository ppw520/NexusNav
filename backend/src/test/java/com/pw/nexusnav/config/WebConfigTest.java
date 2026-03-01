package com.pw.nexusnav.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

class WebConfigTest {

    @Test
    void resolveAllowedOriginsFallsBackToLocalhostWhenConfigMissingOrInvalid() {
        assertArrayEquals(
                new String[]{"http://localhost:*", "http://127.0.0.1:*"},
                WebConfig.resolveAllowedOrigins(null)
        );

        assertArrayEquals(
                new String[]{"http://localhost:*", "http://127.0.0.1:*"},
                WebConfig.resolveAllowedOrigins(List.of("", " ", "*"))
        );
    }

    @Test
    void resolveAllowedOriginsRemovesWildcardAndBlankEntries() {
        String[] resolved = WebConfig.resolveAllowedOrigins(
                List.of(" http://a.example.com ", "*", "https://b.example.com", "   ")
        );

        assertArrayEquals(new String[]{"http://a.example.com", "https://b.example.com"}, resolved);
    }
}
