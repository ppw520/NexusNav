package com.pw.nexusnav.repository;

import com.pw.nexusnav.entity.AppMetaEntity;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class AppMetaRepository {

    private final Map<String, AppMetaEntity> storage = new ConcurrentHashMap<>();

    public Optional<AppMetaEntity> findById(String key) {
        if (key == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(storage.get(key));
    }

    public AppMetaEntity save(AppMetaEntity entity) {
        storage.put(entity.getKey(), entity);
        return entity;
    }

    public void clear() {
        storage.clear();
    }
}
