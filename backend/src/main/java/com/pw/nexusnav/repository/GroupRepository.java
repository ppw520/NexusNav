package com.pw.nexusnav.repository;

import com.pw.nexusnav.entity.GroupEntity;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class GroupRepository {

    private final Map<String, GroupEntity> storage = new ConcurrentHashMap<>();

    public List<GroupEntity> findAll() {
        return new ArrayList<>(storage.values());
    }

    public List<GroupEntity> findAllByOrderByOrderIndexAscNameAsc() {
        return storage.values().stream()
                .sorted(Comparator.comparingInt(GroupEntity::getOrderIndex)
                        .thenComparing(GroupEntity::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
    }

    public Optional<GroupEntity> findById(String id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(storage.get(id));
    }

    public GroupEntity save(GroupEntity entity) {
        storage.put(entity.getId(), entity);
        return entity;
    }

    public void delete(GroupEntity entity) {
        if (entity == null) {
            return;
        }
        storage.remove(entity.getId());
    }

    public void clear() {
        storage.clear();
    }

    public long count() {
        return storage.size();
    }
}
