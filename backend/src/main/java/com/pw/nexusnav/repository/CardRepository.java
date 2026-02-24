package com.pw.nexusnav.repository;

import com.pw.nexusnav.entity.CardEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardRepository extends JpaRepository<CardEntity, String> {
    List<CardEntity> findAllByOrderByOrderIndexAscNameAsc();
}
