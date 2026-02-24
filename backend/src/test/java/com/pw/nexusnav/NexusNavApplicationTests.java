package com.pw.nexusnav;

import com.pw.nexusnav.repository.CardRepository;
import com.pw.nexusnav.repository.GroupRepository;
import com.pw.nexusnav.service.ConfigImportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:sqlite:./target/test-nexusnav.db"
})
class NexusNavApplicationTests {

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private ConfigImportService configImportService;

    @Test
    void contextLoadsAndConfigImportIsIdempotent() {
        long groupCountBefore = groupRepository.count();
        long cardCountBefore = cardRepository.count();
        assertEquals(2, groupCountBefore);
        org.junit.jupiter.api.Assertions.assertTrue(cardCountBefore >= 3);

        ConfigImportService.ImportResult result = configImportService.importConfig(false);
        assertFalse(result.changed());
        assertEquals(groupCountBefore, groupRepository.count());
        assertEquals(cardCountBefore, cardRepository.count());
    }
}
