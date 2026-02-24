package com.pw.nexusnav.config;

import java.net.InetAddress;
import java.net.UnknownHostException;

public final class IpUtils {

    private IpUtils() {
    }

    public static String extractClientIp(String xForwardedFor, String remoteAddr) {
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return remoteAddr;
    }

    public static boolean isLanIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }

        String value = ip.trim();
        if ("localhost".equalsIgnoreCase(value)) {
            return true;
        }

        String normalized = value;
        if (normalized.startsWith("[") && normalized.endsWith("]")) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }
        if (normalized.startsWith("::ffff:")) {
            normalized = normalized.substring("::ffff:".length());
        }

        try {
            InetAddress address = InetAddress.getByName(normalized);
            return address.isLoopbackAddress()
                    || address.isSiteLocalAddress()
                    || address.isLinkLocalAddress();
        } catch (UnknownHostException ignored) {
            return false;
        }
    }
}
