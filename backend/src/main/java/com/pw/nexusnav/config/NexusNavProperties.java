package com.pw.nexusnav.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "nexusnav")
public class NexusNavProperties {

    private String configPath;
    private String navPath;
    private String secretsPath;
    private String masterKey;
    private int healthIntervalSeconds = 30;
    private Security security = new Security();

    public String getConfigPath() {
        return configPath;
    }

    public void setConfigPath(String configPath) {
        this.configPath = configPath;
    }

    public String getNavPath() {
        return navPath;
    }

    public void setNavPath(String navPath) {
        this.navPath = navPath;
    }

    public String getSecretsPath() {
        return secretsPath;
    }

    public void setSecretsPath(String secretsPath) {
        this.secretsPath = secretsPath;
    }

    public String getMasterKey() {
        return masterKey;
    }

    public void setMasterKey(String masterKey) {
        this.masterKey = masterKey;
    }

    public int getHealthIntervalSeconds() {
        return healthIntervalSeconds;
    }

    public void setHealthIntervalSeconds(int healthIntervalSeconds) {
        this.healthIntervalSeconds = healthIntervalSeconds;
    }

    public Security getSecurity() {
        return security;
    }

    public void setSecurity(Security security) {
        this.security = security;
    }

    public static class Security {
        private List<String> allowedOrigins = new ArrayList<>(List.of("http://localhost:*", "http://127.0.0.1:*"));
        private Ssh ssh = new Ssh();

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }

        public Ssh getSsh() {
            return ssh;
        }

        public void setSsh(Ssh ssh) {
            this.ssh = ssh;
        }
    }

    public static class Ssh {
        private boolean strictHostKeyChecking = true;

        public boolean isStrictHostKeyChecking() {
            return strictHostKeyChecking;
        }

        public void setStrictHostKeyChecking(boolean strictHostKeyChecking) {
            this.strictHostKeyChecking = strictHostKeyChecking;
        }
    }
}
