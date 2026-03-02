package com.pw.nexusnav.service;

import com.pw.nexusnav.config.NexusNavProperties;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class SecretCipherService {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final String masterKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public SecretCipherService(NexusNavProperties properties) {
        this.masterKey = properties.getMasterKey();
    }

    public SecretConfigModel.SecretItem encrypt(String plainText) {
        if (!StringUtils.hasText(plainText)) {
            throw new IllegalArgumentException("密文写入失败：明文不能为空");
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(resolveRawKey(), ALGORITHM), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            SecretConfigModel.SecretItem item = new SecretConfigModel.SecretItem();
            item.setAlgorithm("AES-256-GCM");
            item.setIv(Base64.getEncoder().encodeToString(iv));
            item.setCipherText(Base64.getEncoder().encodeToString(encrypted));
            return item;
        } catch (Exception ex) {
            throw new IllegalStateException("密文加密失败", ex);
        }
    }

    public String decrypt(SecretConfigModel.SecretItem item) {
        if (item == null) {
            throw new IllegalArgumentException("密文读取失败：密文字段不能为空");
        }
        try {
            byte[] iv = Base64.getDecoder().decode(item.getIv());
            byte[] cipherBytes = Base64.getDecoder().decode(item.getCipherText());
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(resolveRawKey(), ALGORITHM), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(cipherBytes), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("密文解密失败，请检查主密钥是否正确", ex);
        }
    }

    private byte[] resolveRawKey() {
        if (!StringUtils.hasText(masterKey)) {
            throw new IllegalStateException("缺少主密钥，请设置环境变量 NEXUSNAV_MASTER_KEY");
        }
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(masterKey.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("主密钥格式错误，必须是 Base64 编码", ex);
        }
        if (raw.length != 32) {
            throw new IllegalStateException("主密钥长度错误，解码后必须是 32 字节");
        }
        return raw;
    }
}
