package com.pw.nexusnav.repository;

import com.pw.nexusnav.entity.GroupEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupRepository extends JpaRepository<GroupEntity, String> {
    List<GroupEntity> findAllByOrderByOrderIndexAscNameAsc();
}
