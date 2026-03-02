package com.pw.nexusnav.service;

import com.pw.nexusnav.entity.CardEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class SecretStoreService {

    private final ConfigImportService configImportService;
    private final SecretCipherService secretCipherService;

    public SecretStoreService(
            ConfigImportService configImportService,
            SecretCipherService secretCipherService
    ) {
        this.configImportService = configImportService;
        this.secretCipherService = secretCipherService;
    }

    public String resolveCardSecret(CardEntity card, String secretKey) {
        if (card == null || !StringUtils.hasText(secretKey)) {
            return null;
        }
        return resolveSecretByRef(card.getSecretRefs() == null ? null : card.getSecretRefs().get(secretKey));
    }

    public String resolveSecretByRef(String refId) {
        if (!StringUtils.hasText(refId)) {
            return null;
        }
        SecretConfigModel secretModel = configImportService.parseSecrets(configImportService.loadSecretBytes());
        SecretConfigModel.SecretItem item = secretModel.getSecrets().get(refId);
        if (item == null) {
            return null;
        }
        return secretCipherService.decrypt(item);
    }

    public Map<String, String> mergeSecrets(
            String cardId,
            Map<String, String> existingRefs,
            Map<String, String> incomingSecrets,
            SecretConfigModel secretModel
    ) {
        Map<String, String> merged = existingRefs == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(existingRefs);
        if (incomingSecrets == null || incomingSecrets.isEmpty()) {
            return merged;
        }

        for (Map.Entry<String, String> entry : incomingSecrets.entrySet()) {
            String key = entry.getKey() == null ? "" : entry.getKey().trim();
            if (!StringUtils.hasText(key)) {
                throw new IllegalArgumentException("密文字段名不能为空");
            }
            String incoming = entry.getValue();
            String oldRef = merged.get(key);

            if (incoming == null) {
                continue;
            }
            if (incoming.isBlank()) {
                merged.remove(key);
                if (StringUtils.hasText(oldRef)) {
                    secretModel.getSecrets().remove(oldRef);
                }
                continue;
            }

            String nextRef = buildSecretRef(cardId, key);
            secretModel.getSecrets().put(nextRef, secretCipherService.encrypt(incoming.trim()));
            merged.put(key, nextRef);
            if (StringUtils.hasText(oldRef) && !oldRef.equals(nextRef)) {
                secretModel.getSecrets().remove(oldRef);
            }
        }
        return merged;
    }

    public Map<String, Boolean> toSecretState(Map<String, String> secretRefs) {
        Map<String, Boolean> state = new LinkedHashMap<>();
        if (secretRefs == null || secretRefs.isEmpty()) {
            return state;
        }
        for (Map.Entry<String, String> entry : secretRefs.entrySet()) {
            if (!StringUtils.hasText(entry.getKey())) {
                continue;
            }
            state.put(entry.getKey(), StringUtils.hasText(entry.getValue()));
        }
        return state;
    }

    private String buildSecretRef(String cardId, String secretKey) {
        String normalizedCardId = StringUtils.hasText(cardId) ? cardId.trim() : "card";
        String normalizedKey = secretKey.trim();
        return "card." + normalizedCardId + "." + normalizedKey + "." + UUID.randomUUID().toString().replace("-", "");
    }
}
