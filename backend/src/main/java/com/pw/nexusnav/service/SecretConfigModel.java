package com.pw.nexusnav.service;

import java.util.LinkedHashMap;
import java.util.Map;

public class SecretConfigModel {

    private String version = "1.0";
    private Map<String, SecretItem> secrets = new LinkedHashMap<>();

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public Map<String, SecretItem> getSecrets() {
        return secrets;
    }

    public void setSecrets(Map<String, SecretItem> secrets) {
        this.secrets = secrets;
    }

    public static class SecretItem {
        private String algorithm = "AES-256-GCM";
        private String iv;
        private String cipherText;

        public String getAlgorithm() {
            return algorithm;
        }

        public void setAlgorithm(String algorithm) {
            this.algorithm = algorithm;
        }

        public String getIv() {
            return iv;
        }

        public void setIv(String iv) {
            this.iv = iv;
        }

        public String getCipherText() {
            return cipherText;
        }

        public void setCipherText(String cipherText) {
            this.cipherText = cipherText;
        }
    }
}
