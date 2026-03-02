package com.pw.nexusnav.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.UnaryOperator;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class ConfigMutationService {

    private final ConfigImportService configImportService;
    private final ReentrantLock lock = new ReentrantLock();

    public ConfigMutationService(ConfigImportService configImportService) {
        this.configImportService = configImportService;
    }

    public void mutateNav(Consumer<ConfigModel.NavModel> mutation) {
        mutateInternal(mutation, null, null);
    }

    public void mutateSystem(Consumer<ConfigModel.SystemModel> mutation) {
        mutateInternal(null, mutation, null);
    }

    public void mutateNavAndSecrets(BiConsumer<ConfigModel.NavModel, SecretConfigModel> mutation) {
        mutateInternal(null, null, mutation);
    }

    public <T> T mutateNavAndReturn(
            UnaryOperator<ConfigModel.NavModel> mutation,
            Function<ConfigModel.NavModel, T> resultMapper
    ) {
        Holder<T> holder = new Holder<>();
        mutateNav(model -> {
            ConfigModel.NavModel next = mutation.apply(model);
            if (next != model) {
                model.setVersion(next.getVersion());
                model.setGroups(next.getGroups());
                model.setCards(next.getCards());
            }
            holder.value = resultMapper.apply(model);
        });
        return holder.value;
    }

    private void mutateInternal(
            Consumer<ConfigModel.NavModel> navMutation,
            Consumer<ConfigModel.SystemModel> systemMutation,
            BiConsumer<ConfigModel.NavModel, SecretConfigModel> navSecretMutation
    ) {
        lock.lock();
        try {
            Path navPath = configImportService.resolveWritableNavPath();
            Path systemPath = configImportService.resolveWritableSystemPath();
            Path secretsPath = configImportService.resolveWritableSecretsPath();

            byte[] previousNavBytes = readNullable(navPath);
            byte[] previousSystemBytes = readNullable(systemPath);
            byte[] previousSecretBytes = readNullable(secretsPath);

            ConfigModel.NavModel navModel = configImportService.parseNav(configImportService.loadNavBytes());
            ConfigModel.SystemModel systemModel = configImportService.parseSystem(configImportService.loadSystemBytes());
            SecretConfigModel secretModel = configImportService.parseSecrets(configImportService.loadSecretBytes());

            if (navMutation != null) {
                navMutation.accept(navModel);
            }
            if (systemMutation != null) {
                systemMutation.accept(systemModel);
            }
            if (navSecretMutation != null) {
                navSecretMutation.accept(navModel, secretModel);
            }

            byte[] nextNavBytes = configImportService.stringifyBytes(navModel);
            byte[] nextSystemBytes = configImportService.stringifyBytes(systemModel);
            byte[] nextSecretBytes = configImportService.stringifyBytes(secretModel);

            configImportService.parseNav(nextNavBytes);
            configImportService.parseSystem(nextSystemBytes);
            configImportService.parseSecrets(nextSecretBytes);

            boolean navWritten = false;
            boolean systemWritten = false;
            boolean secretWritten = false;
            try {
                if (navMutation != null || navSecretMutation != null) {
                    writeAtomically(navPath, nextNavBytes);
                    navWritten = true;
                }
                if (systemMutation != null) {
                    writeAtomically(systemPath, nextSystemBytes);
                    systemWritten = true;
                }
                if (navSecretMutation != null) {
                    writeAtomically(secretsPath, nextSecretBytes);
                    secretWritten = true;
                }
                configImportService.importConfig(true);
            } catch (Exception writeException) {
                if (navWritten) {
                    restore(navPath, previousNavBytes);
                }
                if (systemWritten) {
                    restore(systemPath, previousSystemBytes);
                }
                if (secretWritten) {
                    restore(secretsPath, previousSecretBytes);
                }
                try {
                    configImportService.importConfig(true);
                } catch (Exception rollbackException) {
                    writeException.addSuppressed(rollbackException);
                }
                throw writeException;
            }
        } finally {
            lock.unlock();
        }
    }

    private void writeAtomically(Path path, byte[] payload) {
        try {
            Files.createDirectories(path.getParent());
            Path temp = Files.createTempFile(path.getParent(), path.getFileName().toString(), ".tmp");
            Files.write(temp, payload);
            try {
                Files.move(temp, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException ignored) {
                Files.move(temp, path, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new IllegalStateException("写入配置文件失败：" + path, e);
        }
    }

    private byte[] readNullable(Path path) {
        if (!Files.exists(path)) {
            return null;
        }
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new IllegalStateException("读取配置文件失败：" + path, e);
        }
    }

    private void restore(Path path, byte[] backup) {
        try {
            if (backup == null) {
                Files.deleteIfExists(path);
                return;
            }
            writeAtomically(path, backup);
        } catch (Exception e) {
            throw new IllegalStateException("回滚配置文件失败：" + path, e);
        }
    }

    private static class Holder<T> {
        private T value;
    }
}
