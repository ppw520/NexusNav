package com.pw.nexusnav.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.function.Consumer;
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
        mutate(mutation, null);
    }

    public void mutateSystem(Consumer<ConfigModel.SystemModel> mutation) {
        mutate(null, mutation);
    }

    public <T> T mutateNavAndReturn(UnaryOperator<ConfigModel.NavModel> mutation, java.util.function.Function<ConfigModel.NavModel, T> resultMapper) {
        final Holder<T> holder = new Holder<>();
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

    private void mutate(Consumer<ConfigModel.NavModel> navMutation, Consumer<ConfigModel.SystemModel> systemMutation) {
        lock.lock();
        try {
            Path navPath = configImportService.resolveWritableNavPath();
            Path systemPath = configImportService.resolveWritableSystemPath();

            byte[] previousNavBytes = readNullable(navPath);
            byte[] previousSystemBytes = readNullable(systemPath);

            ConfigModel.NavModel navModel = configImportService.parseNav(configImportService.loadNavBytes());
            ConfigModel.SystemModel systemModel = configImportService.parseSystem(configImportService.loadSystemBytes());

            if (navMutation != null) {
                navMutation.accept(navModel);
            }
            if (systemMutation != null) {
                systemMutation.accept(systemModel);
            }

            byte[] nextNavBytes = configImportService.stringifyBytes(navModel);
            byte[] nextSystemBytes = configImportService.stringifyBytes(systemModel);

            configImportService.parseNav(nextNavBytes);
            configImportService.parseSystem(nextSystemBytes);

            boolean navWritten = false;
            boolean systemWritten = false;
            try {
                if (navMutation != null) {
                    writeAtomically(navPath, nextNavBytes);
                    navWritten = true;
                }
                if (systemMutation != null) {
                    writeAtomically(systemPath, nextSystemBytes);
                    systemWritten = true;
                }
                configImportService.importConfig(true);
            } catch (Exception writeException) {
                if (navWritten) {
                    restore(navPath, previousNavBytes);
                }
                if (systemWritten) {
                    restore(systemPath, previousSystemBytes);
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
            throw new IllegalStateException("Cannot write config file: " + path, e);
        }
    }

    private byte[] readNullable(Path path) {
        if (!Files.exists(path)) {
            return null;
        }
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read config file: " + path, e);
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
            throw new IllegalStateException("Cannot restore config file: " + path, e);
        }
    }

    private static class Holder<T> {
        private T value;
    }
}
