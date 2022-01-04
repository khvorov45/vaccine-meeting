library(tidyverse)

data <- read_csv("data/combined.csv", col_types = cols()) %>%
  mutate(
    timepoint = factor(timepoint, levels = c("Pre-vax", "Post-vax")),
    logtitre = log(titre)
  )

common_antigens <- data %>%
  group_by(testing_lab) %>%
  group_map(~ unique(.x$virus)) %>%
  reduce(~ intersect(.x, .y))

data_common_ag <- data %>%
  filter(virus %in% common_antigens)

# SECTION Titres

data_common_ag %>%
  group_by(virus, subtype, timepoint, testing_lab, sample_source) %>%
  summarise(
    .groups = "drop",
    logmean = mean(logtitre),
    logse = sd(logtitre) / sqrt(n()),
    loglow = logmean - 1.96 * logse,
    loghigh = logmean + 1.96 * logse,
    mean = exp(logmean),
    low = exp(loglow),
    high = exp(loghigh),
  )

plot <- data_common_ag %>%
  ggplot(aes(timepoint, titre, color = testing_lab, shape = testing_lab, fill = testing_lab)) +
  theme_bw() +
  theme(
    panel.grid.minor = element_blank(),
    strip.background = element_blank(),
    panel.spacing = unit(0, "null"),
    legend.position = "bottom",
    legend.box.spacing = unit(0, "null")
  ) +
  scale_y_log10("Titre", breaks = 5 * 2^(0:15)) +
  scale_x_discrete("Timepoint") +
  scale_color_discrete("Testing lab") +
  scale_shape_discrete("Testing lab") +
  scale_fill_discrete("Testing lab") +
  facet_grid(
    virus ~ sample_source,
    labeller = function(labels) {
      if ("sample_source" %in% names(labels)) {
        labels$sample_source <- paste0(labels$sample_source, " samples")
      }
      labels
    }
  ) +
  geom_point(position = position_dodge(width = 0.5), alpha = 0.3) +
  geom_boxplot(color = NA, alpha = 0.2, outlier.colour = NA, outlier.fill = NA) +
  geom_boxplot(fill = NA, outlier.colour = NA, outlier.fill = NA)

ggsave("data-summary/titres.pdf", plot, width = 25, height = 15, units = "cm")

# SECTION Measurement differences across centres

fun_one_lab_one_ag_diff <- function(one_subset, key) {
  ref_lab_name <- key$sample_source
  if (!ref_lab_name %in% unique(one_subset$testing_lab)) {
    ref_lab_name <- unique(one_subset$testing_lab)[[1]]
  }
  ag <- key$virus
  ref_lab <- one_subset %>%
    filter(testing_lab == ref_lab_name)
  other_labs <- one_subset %>%
    filter(testing_lab != ref_lab_name)
  if (nrow(other_labs) == 0) {
    return(tibble())
  }
  other_labs %>%
    group_by(testing_lab) %>%
    group_modify(function(one_lab, key) {
      result <- t.test(one_lab$logtitre, ref_lab$logtitre)
      tibble(
        ref_lab = ref_lab_name,
        logdiff = result$estimate[[1]] - result$estimate[[2]],
        loglow = result$conf.int[[1]],
        loghigh = result$conf.int[[2]],
        diff = exp(logdiff),
        low = exp(loglow),
        high = exp(loghigh),
      )
    })
}

measurement_diffs <- data_common_ag %>%
  group_by(sample_source, virus, timepoint) %>%
  group_modify(fun_one_lab_one_ag_diff)

measurement_diffs_plot <- measurement_diffs %>%
  mutate(
    source_and_ref = glue::glue("{sample_source} (ref {ref_lab})")
  ) %>%
  ggplot(aes(timepoint, diff, color = testing_lab, shape = testing_lab, fill = testing_lab)) +
  theme_bw() +
  theme(
    panel.grid.minor = element_blank(),
    strip.background = element_blank(),
    panel.spacing = unit(0, "null"),
    legend.position = "bottom",
    legend.box.spacing = unit(0, "null")
  ) +
  scale_y_log10("Mean fold-difference (95% CI)", breaks = c(0.25, 0.5, 1, 1.5, 2)) +
  scale_x_discrete("Timepoint") +
  scale_color_discrete("Testing lab") +
  scale_shape_discrete("Testing lab") +
  scale_fill_discrete("Testing lab") +
  facet_grid(virus ~ source_and_ref) +
  geom_hline(yintercept = 1, lty = "11", col = "black", alpha = 0.5) +
  geom_pointrange(aes(ymin = low, ymax = high), position = position_dodge(width = 0.5)) +
  ggrepel::geom_label_repel(
    aes(label = testing_lab),
    position = position_dodge(width = 0.5),
    seed = 1, alpha = 0.2
  ) +
  ggrepel::geom_label_repel(
    aes(label = testing_lab),
    position = position_dodge(width = 0.5),
    seed = 1, alpha = 0.8, fill = NA
  )

ggsave(
  "data-summary/measurement-diffs.pdf",
  measurement_diffs_plot,
  width = 20, height = 15, units = "cm"
)
