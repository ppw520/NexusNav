package com.pw.nexusnav.repository;

import com.pw.nexusnav.entity.CardEntity;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class CardRepository {

    private final Map<String, CardEntity> storage = new ConcurrentHashMap<>();

    public List<CardEntity> findAll() {
        return new ArrayList<>(storage.values());
    }

    public List<CardEntity> findAllByOrderByOrderIndexAscNameAsc() {
        return storage.values().stream()
                .sorted(Comparator.comparingInt(CardEntity::getOrderIndex)
                        .thenComparing(CardEntity::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
    }

    public Optional<CardEntity> findById(String id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(storage.get(id));
    }

    public CardEntity save(CardEntity entity) {
        storage.put(entity.getId(), entity);
        return entity;
    }

    public void delete(CardEntity entity) {
        if (entity == null) {
            return;
        }
        storage.remove(entity.getId());
    }

    public void deleteAll(List<CardEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return;
        }
        for (CardEntity entity : entities) {
            delete(entity);
        }
    }

    public void clear() {
        storage.clear();
    }

    public long count() {
        return storage.size();
    }
}
